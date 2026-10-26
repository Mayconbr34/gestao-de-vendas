'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import CompanyFilter from '../../../components/CompanyFilter';
import Modal from '../../../components/Modal';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { buildQuery, formatCurrency, PAYMENT_LABELS } from '../../../lib/format';

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  stock: number;
  price: number;
  categoryName?: string | null;
};

type SaleItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Sale = {
  id: string;
  userEmail?: string | null;
  customerName?: string | null;
  paymentMethod: string;
  status: 'COMPLETED' | 'CANCELED';
  subtotal: number;
  discount: number;
  total: number;
  itemsCount: number;
  createdAt: string;
  items: SaleItem[];
};

type Availability = {
  enabled: boolean;
  companyId: string | null;
  companyName: string | null;
  reason?: string | null;
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export default function PdvPage() {
  const { token, user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canCancel = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';

  const [companyId, setCompanyId] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [discount, setDiscount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null);
  const [canceling, setCanceling] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const scopeQuery = isSuperAdmin ? buildQuery({ companyId }) : '';

  const load = useCallback(async () => {
    if (!token || !user) return;
    if (isSuperAdmin && !companyId) {
      setAvailability({ enabled: false, companyId: null, companyName: null, reason: 'Selecione uma empresa' });
      setProducts([]);
      setSales([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [status, productList, saleList] = await Promise.all([
        apiRequest<Availability>(`/sales/availability${scopeQuery}`, {}, token),
        apiRequest<Product[]>(`/products${scopeQuery}`, {}, token),
        apiRequest<Sale[]>(`/sales${buildQuery({ companyId: isSuperAdmin ? companyId : null, limit: 10 })}`, {}, token)
      ]);
      setAvailability(status);
      setProducts(productList);
      setSales(saleList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o PDV');
    } finally {
      setLoading(false);
    }
  }, [token, user, isSuperAdmin, companyId, scopeQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const filtered = useMemo(() => {
    const term = normalize(search);
    if (!term) return products;
    return products.filter((p) =>
      [p.name, p.sku, p.barcode, p.categoryName].some((field) => field && normalize(field).includes(term))
    );
  }, [products, search]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => ({ product: productById.get(id), quantity }))
        .filter((line): line is { product: Product; quantity: number } => Boolean(line.product)),
    [cart, productById]
  );

  const subtotal = cartLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const discountValue = Math.min(Math.max(Number(discount.replace(',', '.')) || 0, 0), subtotal);
  const total = subtotal - discountValue;
  const itemsCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  const setQuantity = (product: Product, quantity: number) => {
    setMessage('');
    setError('');
    setCart((prev) => {
      const next = { ...prev };
      const bounded = Math.min(Math.max(Math.floor(quantity) || 0, 0), product.stock);
      if (bounded <= 0) delete next[product.id];
      else next[product.id] = bounded;
      return next;
    });
  };

  const addProduct = (product: Product) => {
    const current = cart[product.id] ?? 0;
    if (current >= product.stock) {
      setError(`Estoque insuficiente para "${product.name}" (disponível: ${product.stock}).`);
      return;
    }
    setQuantity(product, current + 1);
  };

  // Enter no campo de busca: adiciona o item com código de barras ou SKU exato (uso com leitor).
  const handleSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const term = search.trim();
    if (!term) return;
    const exact = products.find((p) => p.barcode === term || (p.sku && p.sku.toLowerCase() === term.toLowerCase()));
    const target = exact ?? (filtered.length === 1 ? filtered[0] : null);
    if (target) {
      addProduct(target);
      setSearch('');
    }
  };

  const finalize = async () => {
    if (!token || !cartLines.length) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const sale = await apiRequest<Sale>(
        '/sales',
        {
          method: 'POST',
          body: JSON.stringify({
            items: cartLines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
            paymentMethod,
            discount: discountValue ? Number(discountValue.toFixed(2)) : undefined,
            customerName: customerName.trim() || undefined,
            companyId: isSuperAdmin ? companyId : undefined
          })
        },
        token
      );
      setMessage(`Venda registrada: ${formatCurrency(sale.total)} (${sale.itemsCount} itens, ${PAYMENT_LABELS[sale.paymentMethod]}).`);
      setCart({});
      setDiscount('');
      setCustomerName('');
      await load();
      searchRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar a venda');
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!token || !cancelTarget) return;
    setCanceling(true);
    try {
      await apiRequest(`/sales/${cancelTarget.id}/cancel`, { method: 'POST' }, token);
      setMessage(`Venda de ${formatCurrency(cancelTarget.total)} cancelada e estoque devolvido.`);
      setCancelTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cancelar a venda');
      setCancelTarget(null);
    } finally {
      setCanceling(false);
    }
  };

  if (!user) return null;

  const disabled = !availability?.enabled;

  return (
    <div className="an-page">
      <div className="an-header">
        <div>
          <h1>PDV — Ponto de venda</h1>
          <p>Registre vendas a partir do catálogo; o estoque é baixado automaticamente.</p>
        </div>
        <Link href="/analise" className="btn ghost">
          Ver análise de vendas
        </Link>
      </div>

      {isSuperAdmin ? (
        <div className="an-filters">
          <CompanyFilter token={token} value={companyId} onChange={setCompanyId} allowAll={false} />
        </div>
      ) : null}

      <div aria-live="polite">
        {message ? <div className="message">{message}</div> : null}
        {error ? <div className="message error" role="alert">{error}</div> : null}
      </div>

      {!loading && disabled ? (
        <div className="an-panel">
          <div className="an-empty">
            <strong style={{ display: 'block', fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>
              PDV indisponível
            </strong>
            {availability?.reason || 'O PDV não está habilitado.'}
            {!isSuperAdmin ? ' Solicite a liberação ao administrador da plataforma.' : ' Habilite em Empresas > Config. empresa > Recursos da empresa.'}
          </div>
        </div>
      ) : (
        <div className="pdv-layout">
          <section className="an-panel" aria-labelledby="pdv-catalog-title">
            <div className="an-panel-head">
              <div>
                <h2 id="pdv-catalog-title">Catálogo</h2>
                <p>Clique no produto ou digite o código de barras/SKU e pressione Enter.</p>
              </div>
            </div>
            <div className="pdv-search">
              <label htmlFor="pdv-search" className="sr-only">
                Buscar produto
              </label>
              <input
                id="pdv-search"
                ref={searchRef}
                autoFocus
                placeholder="Buscar por nome, SKU, código de barras ou categoria"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={handleSearchKey}
              />
            </div>
            {loading ? (
              <div className="an-empty">Carregando produtos…</div>
            ) : filtered.length ? (
              <div className="pdv-products">
                {filtered.map((product) => {
                  const inCart = cart[product.id] ?? 0;
                  const soldOut = product.stock - inCart <= 0;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className="pdv-product"
                      onClick={() => addProduct(product)}
                      disabled={soldOut}
                      aria-label={`Adicionar ${product.name}, ${formatCurrency(product.price)}, estoque ${product.stock}`}
                    >
                      <span className="pdv-product__name">{product.name}</span>
                      <span className="pdv-product__meta">
                        {product.categoryName || 'Sem categoria'} · Estoque {product.stock - inCart}
                      </span>
                      {product.sku ? <span className="pdv-product__meta">SKU {product.sku}</span> : null}
                      <span className="pdv-product__price">{formatCurrency(product.price)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="an-empty">Nenhum produto encontrado.</div>
            )}
          </section>

          <aside className="an-panel pdv-cart" aria-labelledby="pdv-cart-title">
            <div className="an-panel-head">
              <div>
                <h2 id="pdv-cart-title">Venda atual</h2>
                <p>
                  {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
                </p>
              </div>
              {cartLines.length ? (
                <button type="button" className="an-link" onClick={() => setCart({})}>
                  Limpar
                </button>
              ) : null}
            </div>

            {cartLines.length ? (
              <ul className="pdv-cart-items" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {cartLines.map(({ product, quantity }) => (
                  <li key={product.id} className="pdv-cart-item">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{product.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{formatCurrency(product.price)} un.</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', textAlign: 'right' }}>
                      {formatCurrency(product.price * quantity)}
                    </div>
                    <div className="pdv-qty" role="group" aria-label={`Quantidade de ${product.name}`}>
                      <button type="button" onClick={() => setQuantity(product, quantity - 1)} aria-label="Diminuir">
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={product.stock}
                        value={quantity}
                        aria-label="Quantidade"
                        onChange={(event) => setQuantity(product, Number(event.target.value))}
                      />
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        disabled={quantity >= product.stock}
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                    </div>
                    <button type="button" className="an-link" onClick={() => setQuantity(product, 0)}>
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="an-empty">Adicione produtos do catálogo.</div>
            )}

            <div className="pdv-pay">
              <label>
                Pagamento
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Desconto (R$)
                <input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value.replace(/[^0-9.,]/g, ''))}
                />
              </label>
              <label className="full">
                Cliente (opcional)
                <input value={customerName} maxLength={160} onChange={(event) => setCustomerName(event.target.value)} />
              </label>
            </div>

            <div className="pdv-totals" aria-live="polite">
              <div>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div>
                <span>Desconto</span>
                <span>− {formatCurrency(discountValue)}</span>
              </div>
              <div className="grand">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <button type="button" className="btn primary" onClick={finalize} disabled={!cartLines.length || saving}>
              {saving ? 'Registrando…' : 'Finalizar venda'}
            </button>
          </aside>
        </div>
      )}

      <section className="an-panel" aria-labelledby="pdv-recent-title">
        <div className="an-panel-head">
          <div>
            <h2 id="pdv-recent-title">Últimas vendas</h2>
            <p>As 10 vendas mais recentes{availability?.companyName ? ` de ${availability.companyName}` : ''}.</p>
          </div>
        </div>
        {sales.length ? (
          <div className="an-table-wrap">
            <table className="an-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Itens</th>
                  <th>Pagamento</th>
                  <th>Operador</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                  {canCancel ? <th><span className="sr-only">Ações</span></th> : null}
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{new Date(sale.createdAt).toLocaleString('pt-BR')}</td>
                    <td title={sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}>
                      {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                    </td>
                    <td>{PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}</td>
                    <td>{sale.userEmail || '-'}</td>
                    <td className="num">{formatCurrency(sale.total)}</td>
                    <td>
                      <span className={`an-badge ${sale.status === 'COMPLETED' ? 'ok' : 'error'}`}>
                        {sale.status === 'COMPLETED' ? 'Concluída' : 'Cancelada'}
                      </span>
                    </td>
                    {canCancel ? (
                      <td>
                        {sale.status === 'COMPLETED' ? (
                          <button type="button" className="an-link" onClick={() => setCancelTarget(sale)}>
                            Cancelar
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="an-empty">Nenhuma venda registrada ainda.</div>
        )}
      </section>

      {cancelTarget ? (
        <Modal
          title="Cancelar venda"
          subtitle={`${formatCurrency(cancelTarget.total)} · ${new Date(cancelTarget.createdAt).toLocaleString('pt-BR')}`}
          onClose={() => setCancelTarget(null)}
          footer={
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setCancelTarget(null)} disabled={canceling}>
                Voltar
              </button>
              <button className="btn primary" onClick={confirmCancel} disabled={canceling}>
                {canceling ? 'Cancelando…' : 'Confirmar cancelamento'}
              </button>
            </div>
          }
        >
          <p className="hint">
            Os itens voltarão ao estoque e a venda deixará de contar nos indicadores. Essa ação fica registrada na
            auditoria.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
