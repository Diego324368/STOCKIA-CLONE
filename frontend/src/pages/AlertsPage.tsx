import type { Product } from '../types/models';
import { MetricCard } from '../components/MetricCard';

export function AlertsPage({ products }: { products: Product[] }) {
  const criticalProducts = products.filter((product) => product.quantity <= product.minQuantity);

  return (
    <>
      <section className="cards">
        <MetricCard label="Alertas ativos" value={criticalProducts.length} tone="warning" />
        <MetricCard label="Itens zerados" value={criticalProducts.filter((product) => product.quantity === 0).length} />
        <MetricCard label="Reposição moderada" value={products.filter((product) => product.quantity > product.minQuantity && product.quantity <= product.minQuantity * 2).length} />
      </section>

      <section className="panel">
        <div className="section-head"><div><p className="eyebrow">Monitoramento</p><h3>Alertas de estoque minimo</h3></div></div>
        <div className="stack">
          {criticalProducts.length > 0 ? criticalProducts.map((product) => (
            <article className="alert-card" key={product.id}>
              <div className="row-between"><strong>{product.name}</strong><span className="badge warning">Urgente</span></div>
              <p>{product.category ?? 'Sem categoria'}</p>
              <small>Quantidade atual: {product.quantity} - Minimo esperado: {product.minQuantity}</small>
            </article>
          )) : <p className="empty">Nenhum alerta no momento.</p>}
        </div>
      </section>
    </>
  );
}
