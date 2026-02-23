'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiRequest, fileUrl } from '../lib/api';
import { fetchPublicPlatformSettings } from '../lib/platform-settings';
import { useTheme } from '../lib/theme';

/* ─── Icons (inline SVG) ─────────────────────────────────── */

const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  box: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  tag: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  building: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  percent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  zap: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  code: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M21 12h-2M5 12H3M12 21v-2M12 5V3"/>
    </svg>
  ),
  globe: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  logout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  chevronDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  menu: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  bell: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  list: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
};

/* ─── Types ──────────────────────────────────────────────── */

type NavItem = { href: string; label: string; icon: React.ReactNode };

/* ─── Data ───────────────────────────────────────────────── */

const primaryItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { href: '/usuarios', label: 'Usuários', icon: Icons.users },
];

const docsItem: NavItem = { href: '/docs', label: 'Docs API', icon: Icons.code };

const productChildren: NavItem[] = [
  { href: '/produtos', label: 'Catálogo', icon: Icons.box },
  { href: '/produtos/novo', label: 'Cadastrar produto', icon: Icons.plus },
  { href: '/produtos/importar', label: 'Importar produtos', icon: Icons.list },
  { href: '/categorias', label: 'Categorias', icon: Icons.tag },
];

const companyChildren: NavItem[] = [
  { href: '/empresa-config', label: 'Config. empresa', icon: Icons.settings },
  { href: '/aliquotas', label: 'Alíquotas UF', icon: Icons.percent },
  { href: '/regras-fiscais', label: 'Regras fiscais', icon: Icons.shield },
  { href: '/simulador', label: 'Simulador', icon: Icons.zap },
  { href: '/api', label: 'API', icon: Icons.code },
  docsItem,
  { href: '/auditoria', label: 'Auditoria', icon: Icons.clock },
];

const companyUserChildren: NavItem[] = [
  { href: '/auditoria', label: 'Auditoria', icon: Icons.clock },
  { href: '/simulador', label: 'Simulador', icon: Icons.zap },
  docsItem,
];

const adminOpsChildren: NavItem[] = [
  { href: '/aliquotas', label: 'Alíquotas UF', icon: Icons.percent },
  { href: '/regras-fiscais', label: 'Regras fiscais', icon: Icons.shield },
  { href: '/simulador', label: 'Simulador', icon: Icons.zap },
  { href: '/api', label: 'API', icon: Icons.code },
  docsItem,
];

const platformChildren: NavItem[] = [
  { href: '/plataforma', label: 'Config. plataforma', icon: Icons.settings },
  { href: '/empresas', label: 'Empresas', icon: Icons.globe },
  { href: '/auditoria', label: 'Auditoria', icon: Icons.clock },
];

const userChildren: NavItem[] = [
  { href: '/perfil', label: 'Meu perfil', icon: Icons.user },
];

/* ─── NavLink ────────────────────────────────────────────── */

function NavLink({ href, label, icon, active, indent = false }: NavItem & { active: boolean; indent?: boolean }) {
  return (
    <Link
      href={href}
      className={`sb-nav-link${active ? ' active' : ''}${indent ? ' indent' : ''}`}
    >
      <span className="sb-nav-icon">{icon}</span>
      <span className="sb-nav-label">{label}</span>
    </Link>
  );
}

/* ─── NavGroup ───────────────────────────────────────────── */

function NavGroup({
  label,
  icon,
  items,
  pathname,
  defaultOpen = false
}: {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  pathname: string;
  defaultOpen?: boolean;
}) {
  const anyActive = items.some((i) => pathname === i.href);
  const [open, setOpen] = useState(defaultOpen || anyActive);

  useEffect(() => {
    if (anyActive) {
      setOpen(true);
    }
  }, [anyActive]);

  const groupStyle = {
    '--sb-items-height': `${items.length * 42}px`
  } as CSSProperties;

  return (
    <div className="sb-nav-group" style={groupStyle}>
      <button
        type="button"
        className={`sb-nav-group__head${anyActive ? ' active' : ''}`}
        onClick={() => setOpen((p) => !p)}
      >
        <span className="sb-nav-icon">{icon}</span>
        <span className="sb-nav-label">{label}</span>
        <span className={`sb-nav-chevron${open ? ' open' : ''}`}>{Icons.chevronDown}</span>
      </button>
      <div className={`sb-nav-group__items${open ? ' open' : ''}`}>
        {items.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} indent />
        ))}
      </div>
    </div>
  );
}

/* ─── Section label ──────────────────────────────────────── */

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="sb-section">
      {children}
    </div>
  );
}

/* ─── Sidebar content (shared between desktop & mobile) ──── */

function SidebarContent({
  platformName,
  brandInitials,
  role,
  pathname,
  userEmail,
  avatarSrc,
  userInitial,
  online,
  browser,
  sessionLocation,
  userMenuOpen,
  setUserMenuOpen,
  onLogout,
  userRef,
  theme,
  toggleTheme,
}: {
  platformName: string;
  brandInitials: string;
  role?: string | null;
  pathname: string;
  userEmail?: string | null;
  avatarSrc: string;
  userInitial: string;
  online: boolean;
  browser: string;
  sessionLocation: string;
  userMenuOpen: boolean;
  setUserMenuOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  onLogout: () => void;
  userRef: React.RefObject<HTMLDivElement>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}) {
  return (
    <div className="sb-panel">
      {/* Brand */}
      <div className="sb-brand">
        <div className="sb-brand-icon">
          {brandInitials || 'PL'}
        </div>
        <div>
          <div className="sb-brand-title">
            {platformName}
          </div>
          <div className="sb-brand-subtitle">
            Admin console
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="sb-nav">
        {role !== 'COMPANY_USER' && primaryItems.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}

        {role === 'COMPANY_USER' ? (
          <>
            <SectionLabel>Configurações</SectionLabel>
            <NavGroup label="Configurações" icon={Icons.settings} items={companyUserChildren} pathname={pathname} defaultOpen />
          </>
        ) : (
          <>
            <SectionLabel>Catálogo</SectionLabel>
            <NavGroup label="Produtos" icon={Icons.box} items={productChildren} pathname={pathname} defaultOpen />

            <SectionLabel>{role !== 'SUPER_ADMIN' ? 'Empresa' : 'Operações'}</SectionLabel>
            {role !== 'SUPER_ADMIN' ? (
              <NavGroup label="Configurações" icon={Icons.building} items={companyChildren} pathname={pathname} defaultOpen />
            ) : (
              <NavGroup label="Operações" icon={Icons.shield} items={adminOpsChildren} pathname={pathname} defaultOpen />
            )}

            {role === 'SUPER_ADMIN' && (
              <>
                <SectionLabel>Plataforma</SectionLabel>
                <NavGroup label="Plataforma" icon={Icons.globe} items={platformChildren} pathname={pathname} defaultOpen />
              </>
            )}

            <SectionLabel>Usuário</SectionLabel>
            {userChildren.map((item) => (
              <NavLink key={item.href} {...item} active={pathname === item.href} />
            ))}
          </>
        )}
      </div>

      {/* User footer */}
      <div ref={userRef} className="sb-footer">
        <div className="sb-theme">
          <span>Modo escuro</span>
          <button
            type="button"
            className={`sb-switch${theme === 'dark' ? ' on' : ''}`}
            aria-pressed={theme === 'dark'}
            onClick={toggleTheme}
          >
            <span className="sb-switch-thumb" />
          </button>
        </div>
        {/* Popup */}
        {userMenuOpen && (
          <div className="sb-user-popup">
            {/* Info */}
            <div className="sb-user-popup__header">
              <div className="sb-user-name">
                {userEmail || 'Sessão ativa'}
              </div>
              <div className="sb-user-popup__status">
                <span className={`sb-status-dot ${online ? 'online' : 'offline'}`} />
                <span>
                  {online ? 'Online' : 'Offline'} · {browser} · {sessionLocation}
                </span>
              </div>
            </div>

            {/* Items */}
            {[
              { href: '/perfil', label: 'Meu perfil', icon: Icons.user },
              { href: '/empresa-config', label: 'Configurações', icon: Icons.settings },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setUserMenuOpen(false)}
                className="sb-user-item"
              >
                <span className="sb-user-item__icon">{item.icon}</span>
                <span className="sb-user-item__label">{item.label}</span>
              </Link>
            ))}

            {/* Logout */}
            <div className="sb-user-popup__footer">
              <button
                onClick={onLogout}
                className="sb-user-item sb-user-item--danger"
              >
                <span className="sb-user-item__icon">{Icons.logout}</span>
                <span className="sb-user-item__label">Sair</span>
              </button>
            </div>
          </div>
        )}

        {/* Chip */}
        <div
          onClick={() => setUserMenuOpen((p) => !p)}
          className={`sb-user-chip${userMenuOpen ? ' open' : ''}`}
        >
          <div className="sb-user-avatar">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt="Avatar" />
            ) : (
              <span className="sb-user-initial">
                {userInitial}
              </span>
            )}
          </div>
          <div className="sb-user-meta">
            <div className="sb-user-name">
              {userEmail || 'Sessão ativa'}
            </div>
            <div className="sb-user-role">
              <span className={`sb-status-dot ${online ? 'online' : 'offline'}`} />
              {role === 'SUPER_ADMIN' ? 'Super Admin' : role || 'Usuário'}
            </div>
          </div>
          <span className={`sb-user-chevron${userMenuOpen ? ' open' : ''}`}>
            {Icons.chevronDown}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main export ────────────────────────────────────────── */

export default function Sidebar({
  userEmail,
  role,
  token,
  avatarUrl,
  onLogout,
}: {
  userEmail?: string | null;
  role?: string | null;
  token?: string | null;
  avatarUrl?: string | null;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [sessionLocation, setSessionLocation] = useState<string>('-');
  const [sessionAgent, setSessionAgent] = useState<string>('');
  const [platformName, setPlatformName] = useState('Plataforma');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopUserRef = useRef<HTMLDivElement>(null);
  const mobileUserRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOnline(navigator.onLine);
    const h = () => setOnline(navigator.onLine);
    window.addEventListener('online', h);
    window.addEventListener('offline', h);
    return () => { window.removeEventListener('online', h); window.removeEventListener('offline', h); };
  }, []);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ userAgent?: string; location?: Record<string, unknown> | null }>('/auth/session', {}, token)
      .then((data) => {
        setSessionAgent(data.userAgent || '');
        if (!data.location) { setSessionLocation('-'); return; }
        const loc = data.location as Record<string, string | undefined>;
        const parts = [loc.city || loc.cidade, loc.region_code || loc.region || loc.state, loc.country_name || loc.country].filter(Boolean);
        setSessionLocation(parts.join(' · ') || '-');
      })
      .catch(() => setSessionLocation('-'));
  }, [token]);

  useEffect(() => {
    fetchPublicPlatformSettings()
      .then((d) => setPlatformName(d.platformName || 'Plataforma'))
      .catch(() => setPlatformName('Plataforma'));
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDesktop = desktopUserRef.current?.contains(target);
      const inMobile = mobileUserRef.current?.contains(target);
      if (!inDesktop && !inMobile) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const browser = useMemo(() => {
    if (typeof window === 'undefined') return 'Browser';
    const ua = sessionAgent || navigator.userAgent;
    if (/Edg/i.test(ua)) return 'Edge';
    if (/Chrome/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua)) return 'Safari';
    return 'Browser';
  }, [sessionAgent]);

  const brandInitials = platformName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  const avatarSrc = avatarUrl ? fileUrl(avatarUrl) : '';
  const userInitial = userEmail?.[0]?.toUpperCase() || 'U';

  const sharedProps = {
    platformName,
    brandInitials,
    role,
    pathname,
    userEmail,
    avatarSrc,
    userInitial,
    online,
    browser,
    sessionLocation,
    userMenuOpen,
    setUserMenuOpen,
    onLogout,
    theme,
    toggleTheme,
  };

  return (
    <div className="sb-root">
      {/* Desktop */}
      <aside className="sb-desktop">
        <SidebarContent {...sharedProps} userRef={desktopUserRef} />
      </aside>

      {/* Mobile topbar */}
      <div className="sb-mobile-bar">
        <div className="sb-mobile-brand">
          <div className="sb-brand-icon">{brandInitials || 'PL'}</div>
          <span className="sb-brand-title">{platformName}</span>
        </div>
        <button
          onClick={() => setMobileOpen((p) => !p)}
          className="sb-mobile-toggle"
        >
          {mobileOpen ? Icons.x : Icons.menu}
        </button>
      </div>

      {/* Mobile overlay + panel */}
      {mobileOpen && <div className="sb-overlay" onClick={() => setMobileOpen(false)} />}
      <div className={`sb-mobile-panel${mobileOpen ? ' open' : ''}`}>
        <SidebarContent {...sharedProps} userRef={mobileUserRef} />
      </div>
    </div>
  );
}
