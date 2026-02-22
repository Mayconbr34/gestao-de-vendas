'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiRequest, fileUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

/* ─── Types ────────────────────────────────────────────── */

type PlatformSettings = {
  platformName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

type Metrics = {
  companies: number;
  users: number;
  products: number;
  categories: number;
  apiKeys: number;
  audits: number;
  icmsRates: number;
  fiscalRules: number;
};

type AuditLog = {
  id: string;
  action: string;
  resource: string;
  resourceName?: string | null;
  resourceId?: string | null;
  createdAt: string;
  userEmail?: string | null;
  companyName?: string | null;
};

type CategoryItem = {
  id: string;
  name: string;
  productCount: number;
};

type ApiKeyItem = {
  id: string;
  name: string;
  totalRequests: number;
  requestsLastHour: number;
};

const CATEGORY_COLORS = ['#2563eb', '#0ea5e9', '#6366f1', '#94a3b8'];

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const actionLabels: Record<string, string> = {
  CREATE_PRODUCT: 'Novo produto cadastrado',
  UPDATE_PRODUCT: 'Produto atualizado',
  DELETE_PRODUCT: 'Produto removido',
  CREATE_CATEGORY: 'Nova categoria criada',
  CREATE_USER: 'Novo usuário criado',
  UPDATE_USER: 'Usuário atualizado',
  DELETE_USER: 'Usuário removido',
  UPDATE_PROFILE: 'Perfil atualizado',
  UPDATE_AVATAR: 'Avatar atualizado',
  CREATE_API_KEY: 'API key criada',
  UPDATE_API_KEY: 'API key atualizada',
  DELETE_API_KEY: 'API key desativada',
  CREATE_COMPANY: 'Empresa criada',
  UPDATE_COMPANY: 'Empresa atualizada',
  UPDATE_PLATFORM_SETTINGS: 'Configuração da plataforma atualizada'
};

const resourceType: Record<string, string> = {
  products: 'product',
  categories: 'product',
  users: 'user',
  'api-keys': 'api',
  audits: 'audit',
  companies: 'company',
  'fiscal-rules': 'fiscal',
  'icms-rates': 'fiscal'
};

const eventColor: Record<string, string> = {
  product: '#2563eb',
  user: '#10b981',
  fiscal: '#f59e0b',
  api: '#6366f1',
  audit: '#94a3b8',
  company: '#0ea5e9'
};

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes <= 0) return 'agora';
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function buildMonthlySeries(audits: AuditLog[], months = 12) {
  const buckets = new Map<string, { products: number; users: number; total: number }>();
  audits.forEach((audit) => {
    const date = new Date(audit.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = buckets.get(key) ?? { products: 0, users: 0, total: 0 };
    bucket.total += 1;
    if (audit.action === 'CREATE_PRODUCT') bucket.products += 1;
    if (audit.action === 'CREATE_USER') bucket.users += 1;
    buckets.set(key, bucket);
  });

  const now = new Date();
  return Array.from({ length: months }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = buckets.get(key) ?? { products: 0, users: 0, total: 0 };
    return {
      month: MONTH_LABELS[date.getMonth()],
      produtos: bucket.products,
      usuarios: bucket.users,
      auditorias: bucket.total
    };
  });
}

function buildActivitySeries(audits: AuditLog[]) {
  const buckets = Array.from({ length: 8 }, (_, idx) => ({
    hour: `${idx * 3}h`,
    atividade: 0
  }));
  const now = Date.now();
  audits.forEach((audit) => {
    const date = new Date(audit.createdAt);
    if (Number.isNaN(date.getTime())) return;
    if (now - date.getTime() > 24 * 60 * 60 * 1000) return;
    const index = Math.floor(date.getHours() / 3);
    if (buckets[index]) buckets[index].atividade += 1;
  });
  return buckets;
}

function buildCategorySeries(categories: CategoryItem[]) {
  if (!categories.length) return [];
  const total = categories.reduce((sum, item) => sum + item.productCount, 0);
  if (!total) return [];
  const sorted = [...categories].sort((a, b) => b.productCount - a.productCount);
  const top = sorted.slice(0, 4);
  const rest = sorted.slice(4).reduce((sum, item) => sum + item.productCount, 0);
  const series = top.map((item) => ({
    name: item.name,
    value: Math.round((item.productCount / total) * 100)
  }));
  if (rest > 0) {
    series.push({ name: 'Outros', value: Math.round((rest / total) * 100) });
  }
  return series;
}

function buildApiSeries(keys: ApiKeyItem[]) {
  if (!keys.length) return [];
  return [...keys]
    .sort((a, b) => b.totalRequests - a.totalRequests)
    .slice(0, 7)
    .map((item) => ({
      name: item.name || item.id.slice(0, 6),
      requests: item.totalRequests
    }));
}

function buildRecentEvents(audits: AuditLog[]) {
  return audits.slice(0, 6).map((audit) => {
    const date = new Date(audit.createdAt);
    const baseLabel =
      actionLabels[audit.action] || audit.action.replace(/_/g, ' ').toLowerCase();
    const label = audit.resourceName ? `${baseLabel} · ${audit.resourceName}` : baseLabel;
    return {
      label,
      time: Number.isNaN(date.getTime()) ? '-' : formatRelativeTime(date),
      type: resourceType[audit.resource] || 'audit'
    };
  });
}

/* ─── Sub-components ────────────────────────────────────── */

const customTooltipStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
  fontFamily: 'var(--db-font)',
  color: 'var(--ink)',
  boxShadow: 'var(--shadow)',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={customTooltipStyle}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{p.value.toLocaleString('pt-BR')}</strong>
        </p>
      ))}
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  trend,
  trendUp,
  color = '#2563eb',
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            background: `${color}12`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon}
        </div>
        {trend && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: trendUp ? '#10b981' : '#f59e0b',
              background: trendUp ? '#f0fdf4' : '#fffbeb',
              padding: '3px 7px',
              borderRadius: '20px',
              fontFamily: 'var(--db-font)',
            }}
          >
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'var(--ink)',
            letterSpacing: '-0.035em',
            lineHeight: 1,
            fontFamily: 'var(--db-font)',
          }}
        >
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--muted)',
            marginTop: '5px',
            fontFamily: 'var(--db-font)',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

/* ─── Chart Card ─────────────────────────────────────────── */

function ChartCard({
  title,
  subtitle,
  children,
  fullWidth = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px 24px',
        gridColumn: fullWidth ? '1 / -1' : undefined,
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)', letterSpacing: '-0.01em', fontFamily: 'var(--db-font)' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', fontFamily: 'var(--db-font)' }}>
            {subtitle}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─── Quick action button ────────────────────────────────── */

function QuickBtn({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '9px 14px',
        background: hov ? 'var(--sidebar-active-bg)' : 'var(--surface)',
        border: `1px solid ${hov ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '8px',
        textDecoration: 'none',
        transition: 'all 0.12s',
        color: hov ? 'var(--accent)' : 'var(--ink)',
        fontSize: '13px',
        fontWeight: '500',
        fontFamily: 'var(--db-font)',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'flex', opacity: 0.7 }}>{icon}</span>
      {label}
    </Link>
  );
}

/* ─── SVG Icons ──────────────────────────────────────────── */

const Ic = {
  building: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  box: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  tag: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  code: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  percent: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M21 12h-2M5 12H3M12 21v-2M12 5V3"/></svg>,
  zap: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  list: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  globe: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

/* ─── Main page ──────────────────────────────────────────── */

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<PlatformSettings | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({
    companies: 0, users: 0, products: 0, categories: 0,
    apiKeys: 0, audits: 0, icmsRates: 0, fiscalRules: 0,
  });
  const [monthlySeries, setMonthlySeries] = useState(() => buildMonthlySeries([]));
  const [apiSeries, setApiSeries] = useState<{ name: string; requests: number }[]>([]);
  const [categorySeries, setCategorySeries] = useState<{ name: string; value: number }[]>([]);
  const [activitySeries, setActivitySeries] = useState<{ hour: string; atividade: number }[]>([]);
  const [recentEvents, setRecentEvents] = useState<{ label: string; time: string; type: string }[]>([]);

  useEffect(() => {
    if (!token || !user) return;
    const load = async () => {
      setLoading(true);
      try {
        if (user.role === 'SUPER_ADMIN') {
          const [audits, companies, users, products, categories, apiKeys, platformSettings] =
            await Promise.all([
              apiRequest<AuditLog[]>('/audits', {}, token),
              apiRequest<any[]>('/companies', {}, token),
              apiRequest<any[]>('/users', {}, token),
              apiRequest<any[]>('/products', {}, token),
              apiRequest<CategoryItem[]>('/categories', {}, token),
              apiRequest<ApiKeyItem[]>('/api-keys', {}, token),
              apiRequest<PlatformSettings>('/platform-settings', {}, token),
            ]);

          setPlatform(platformSettings);
          setMetrics({
            companies: companies.length,
            users: users.length,
            products: products.length,
            categories: categories.length,
            apiKeys: apiKeys.length,
            audits: audits.length,
            icmsRates: 0,
            fiscalRules: 0
          });
          setMonthlySeries(buildMonthlySeries(audits));
          setActivitySeries(buildActivitySeries(audits));
          setRecentEvents(buildRecentEvents(audits));
          setCategorySeries(buildCategorySeries(categories));
          setApiSeries(buildApiSeries(apiKeys));
        } else if (user.role === 'COMPANY_ADMIN') {
          const [audits, users, products, categories, apiKeys, icmsRates, fiscalRules] =
            await Promise.all([
              apiRequest<AuditLog[]>('/audits', {}, token),
              apiRequest<any[]>('/users', {}, token),
              apiRequest<any[]>('/products', {}, token),
              apiRequest<CategoryItem[]>('/categories', {}, token),
              apiRequest<ApiKeyItem[]>('/api-keys', {}, token),
              apiRequest<any[]>('/icms-rates', {}, token),
              apiRequest<any[]>('/fiscal-rules', {}, token),
            ]);

          setMetrics({
            companies: 0,
            users: users.length,
            products: products.length,
            categories: categories.length,
            apiKeys: apiKeys.length,
            audits: audits.length,
            icmsRates: icmsRates.length,
            fiscalRules: fiscalRules.length
          });
          setMonthlySeries(buildMonthlySeries(audits));
          setActivitySeries(buildActivitySeries(audits));
          setRecentEvents(buildRecentEvents(audits));
          setCategorySeries(buildCategorySeries(categories));
          setApiSeries(buildApiSeries(apiKeys));
        } else {
          const [audits, products, categories] = await Promise.all([
            apiRequest<AuditLog[]>('/audits', {}, token),
            apiRequest<any[]>('/products', {}, token),
            apiRequest<CategoryItem[]>('/categories', {}, token),
          ]);

          setMetrics({
            companies: 0,
            users: 0,
            products: products.length,
            categories: categories.length,
            apiKeys: 0,
            audits: audits.length,
            icmsRates: 0,
            fiscalRules: 0
          });
          setMonthlySeries(buildMonthlySeries(audits));
          setActivitySeries(buildActivitySeries(audits));
          setRecentEvents(buildRecentEvents(audits));
          setCategorySeries(buildCategorySeries(categories));
          setApiSeries([]);
        }
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, user]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const companyLogo = user?.company?.logoUrl ? fileUrl(user.company.logoUrl) : null;

  if (!user) return null;

  if (loading) {
    return (
      <div style={pageStyle}>
        <SkeletonLoader />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* ── Header ── */}
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--ink)', letterSpacing: '-0.03em', fontFamily: 'var(--db-font)' }}>
            {greeting}, {user.name || user.email?.split('@')[0] || 'Admin'} 👋
          </div>
          <div style={{ fontSize: '13.5px', color: 'var(--muted)', marginTop: '4px', fontFamily: 'var(--db-font)' }}>
            {user.role === 'SUPER_ADMIN' ? 'Visão geral da plataforma' : user.role === 'COMPANY_ADMIN' ? `Indicadores de ${user.company?.tradeName || 'sua empresa'}` : 'Resumo da operação'} · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        {user.role !== 'SUPER_ADMIN' && user.company && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
            {companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogo} alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '28px', height: '28px', background: 'var(--surface)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--ink)', fontFamily: 'var(--db-font)' }}>
                {user.company.tradeName?.[0] || 'E'}
              </div>
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)', fontFamily: 'var(--db-font)' }}>{user.company.tradeName}</div>
              <div style={{ fontSize: '11px', color: '#10b981', fontFamily: 'var(--db-font)' }}>● Empresa ativa</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      {user.role === 'SUPER_ADMIN' && (
        <div style={gridStyle(240)}>
          <StatCard label="Empresas" value={metrics.companies} icon={Ic.building} trend="12%" trendUp color="#2563eb" />
          <StatCard label="Usuários" value={metrics.users} icon={Ic.users} trend="8%" trendUp color="#6366f1" />
          <StatCard label="Produtos" value={metrics.products} icon={Ic.box} trend="24%" trendUp color="#0ea5e9" />
          <StatCard label="Categorias" value={metrics.categories} icon={Ic.tag} color="#f59e0b" />
          <StatCard label="APIs criadas" value={metrics.apiKeys} icon={Ic.code} trend="5%" trendUp color="#10b981" />
          <StatCard label="Auditorias" value={metrics.audits} icon={Ic.clock} color="#94a3b8" />
        </div>
      )}

      {user.role === 'COMPANY_ADMIN' && (
        <div style={gridStyle(240)}>
          <StatCard label="Usuários" value={metrics.users} icon={Ic.users} trend="8%" trendUp color="#2563eb" />
          <StatCard label="Produtos" value={metrics.products} icon={Ic.box} trend="24%" trendUp color="#0ea5e9" />
          <StatCard label="Categorias" value={metrics.categories} icon={Ic.tag} color="#f59e0b" />
          <StatCard label="Regras fiscais" value={metrics.fiscalRules} icon={Ic.shield} color="#6366f1" />
          <StatCard label="Alíquotas UF" value={metrics.icmsRates} icon={Ic.percent} color="#10b981" />
          <StatCard label="APIs criadas" value={metrics.apiKeys} icon={Ic.code} trend="5%" trendUp color="#0ea5e9" />
          <StatCard label="Auditorias" value={metrics.audits} icon={Ic.clock} color="#94a3b8" />
        </div>
      )}

      {user.role === 'COMPANY_USER' && (
        <div style={gridStyle(240)}>
          <StatCard label="Produtos" value={metrics.products} icon={Ic.box} trend="24%" trendUp color="#2563eb" />
          <StatCard label="Categorias" value={metrics.categories} icon={Ic.tag} color="#0ea5e9" />
        </div>
      )}

      {/* ── Charts row 1: Line + Bar ── */}
      <div style={gridStyle(320)}>
        <ChartCard title="Crescimento mensal" subtitle="Produtos, usuários e auditorias nos últimos 12 meses">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlySeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'var(--db-font)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'var(--db-font)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="produtos" name="Produtos" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--accent)' }} />
              <Line type="monotone" dataKey="usuarios" name="Usuários" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
              <Line type="monotone" dataKey="auditorias" name="Auditorias" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#f59e0b' }} />
            </LineChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            {[['var(--accent)', 'Produtos'], ['#10b981', 'Usuários'], ['#f59e0b', 'Auditorias']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontFamily: 'var(--db-font)' }}>{label}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Requisições de API" subtitle="Top APIs por volume de chamadas">
          {apiSeries.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={apiSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'var(--db-font)' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'var(--db-font)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="requests" name="Requisições" fill="var(--accent)" radius={[5, 5, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--db-font)' }}>
              Nenhum dado de API disponível para este perfil.
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Charts row 2: Area + Pie ── */}
      <div style={gridStyle(320)}>
        <ChartCard title="Atividade do sistema" subtitle="Distribuição de ações por hora hoje">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activitySeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'var(--db-font)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'var(--db-font)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="atividade" name="Ações" stroke="var(--accent)" strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--accent)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribuição por categoria" subtitle="Proporção de produtos por categoria">
          {categorySeries.length ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={categorySeries} innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {categorySeries.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Fatia']}
                    contentStyle={customTooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, paddingLeft: '4px' }}>
                {categorySeries.map((cat, i) => (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: CATEGORY_COLORS[i % CATEGORY_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--ink)', fontFamily: 'var(--db-font)', flex: 1 }}>{cat.name}</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--ink)', fontFamily: 'var(--db-font)' }}>{cat.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--db-font)' }}>
              Nenhuma categoria com produtos cadastrados.
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Bottom row: Quick actions + Recent activity ── */}
      <div style={gridStyle(320)}>
        {/* Quick actions */}
        <ChartCard title="Ações rápidas" subtitle="Atalhos para operações frequentes">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {user.role === 'SUPER_ADMIN' && (
              <>
                <QuickBtn href="/empresas" label="Ver empresas" icon={Ic.building} />
                <QuickBtn href="/empresas/nova" label="Nova empresa" icon={Ic.plus} />
                <QuickBtn href="/plataforma" label="Config. plataforma" icon={Ic.settings} />
                <QuickBtn href="/auditoria" label="Auditoria" icon={Ic.clock} />
                <QuickBtn href="/usuarios" label="Usuários" icon={Ic.users} />
              </>
            )}
            {user.role === 'COMPANY_ADMIN' && (
              <>
                <QuickBtn href="/produtos/novo" label="Novo produto" icon={Ic.plus} />
                <QuickBtn href="/usuarios" label="Novo usuário" icon={Ic.users} />
                <QuickBtn href="/aliquotas" label="Alíquotas UF" icon={Ic.percent} />
                <QuickBtn href="/regras-fiscais" label="Regras fiscais" icon={Ic.shield} />
                <QuickBtn href="/simulador" label="Simulador" icon={Ic.zap} />
                <QuickBtn href="/api" label="Gerar API" icon={Ic.code} />
              </>
            )}
            {user.role === 'COMPANY_USER' && (
              <>
                <QuickBtn href="/produtos" label="Produtos" icon={Ic.box} />
                <QuickBtn href="/categorias" label="Categorias" icon={Ic.tag} />
                <QuickBtn href="/simulador" label="Simulador" icon={Ic.zap} />
                <QuickBtn href="/perfil" label="Meu perfil" icon={Ic.globe} />
              </>
            )}
          </div>
        </ChartCard>

        {/* Recent activity */}
        <ChartCard title="Atividade recente" subtitle="Últimas ações no sistema">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {recentEvents.length ? (
              recentEvents.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 0',
                    borderBottom: i < recentEvents.length - 1 ? '1px solid var(--surface)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: eventColor[ev.type] || '#94a3b8',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: 'var(--db-font)', flex: 1 }}>
                    {ev.label}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--db-font)', whiteSpace: 'nowrap' }}>
                    {ev.time}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--db-font)' }}>
                Nenhuma atividade registrada ainda.
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Platform info (SUPER_ADMIN) */}
      {user.role === 'SUPER_ADMIN' && platform && (
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)', fontFamily: 'var(--db-font)' }}>{platform.platformName}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px', fontFamily: 'var(--db-font)' }}>
              {platform.contactEmail || 'Sem email'} · {platform.contactPhone || 'Sem telefone'}
            </div>
          </div>
          <Link href="/plataforma" style={{
            fontSize: '13px',
            color: 'var(--accent)',
            textDecoration: 'none',
            fontWeight: '500',
            fontFamily: 'var(--db-font)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}>
            {Ic.settings} Gerenciar plataforma
          </Link>
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton Loader ────────────────────────────────────── */

function SkeletonLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ height: '60px', background: 'var(--surface)', borderRadius: '10px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: '110px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ height: '280px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '280px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out 0.1s infinite' }} />
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const pageStyle: React.CSSProperties = {
  padding: 0,
  width: '100%',
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  fontFamily: 'var(--db-font)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '12px',
  marginBottom: '4px',
};

function gridStyle(min = 240): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap: '16px',
  };
}
