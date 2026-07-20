import type { Product } from '../types/models';
import { MetricCard } from '../components/MetricCard';
import { money } from '../lib/format';
import { getReportMetrics } from '../lib/stock';

export function ReportsPage({ products }: { products: Product[] }) {
  const metrics = getReportMetrics(products);

  return (
    <>
      <section className="cards">
        <MetricCard label="Itens em estoque" value={metrics.totalItems} tone="accent" />
        <MetricCard label="Valor estimado" value={money(metrics.stockValue)} />
        <MetricCard label="Ticket medio por item" value={money(metrics.averageTicket)} />
        <MetricCard label="Produtos criticos" value={metrics.criticalProducts.length} tone="warning" />
      </section>

      <section className="content-grid two-columns">
        <article className="panel">
          <div className="section-head"><div><p className="eyebrow">Distribuicao</p><h3>Categoria x quantidade</h3></div></div>
          <div className="bar-list">
            {metrics.byCategoryValue.map(([category, quantity]) => (
              <div className="bar-row" key={category}>
                <span>{category}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, quantity)}%` }} /></div><strong>{quantity}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-head"><div><p className="eyebrow">Leitura rapida</p><h3>Produtos por unidade</h3></div></div>
          <div className="summary-grid compact">
            {metrics.byUnit.map(([unit, count]) => <div className="summary-chip" key={unit}><strong>{unit}</strong><span>{count} itens</span></div>)}
          </div>
          <div className="spacer" />
          <h3>Reposicao urgente</h3>
          <div className="stack">
            {metrics.criticalProducts.length > 0 ? metrics.criticalProducts.map((product) => (
              <article className="report-card" key={product.id}><strong>{product.name}</strong><span>{product.category ?? 'Sem categoria'} - {product.quantity} {product.unit ?? 'un'}</span></article>
            )) : <p className="empty">Nenhum produto precisa de reposicao.</p>}
          </div>
        </article>
      </section>
    </>
  );
}
