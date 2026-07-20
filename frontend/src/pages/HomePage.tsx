import type { AccessLog, AppUser, DashboardIntelligence, Product } from '../types/models';
import { MetricCard } from '../components/MetricCard';
import { dateTime, money } from '../lib/format';
import { getAccessMetrics, getDashboardMetrics, getReportMetrics, isAdmin, productStatus } from '../lib/stock';
import { Badge } from '../components/Badge';
import { SmartDashboardSections } from './IntelligencePages';

type HomePageProps = {
  user: AppUser;
  users: AppUser[];
  products: Product[];
  accessLogs: AccessLog[];
  lastSyncedAt: string | null;
  dashboard: DashboardIntelligence | null;
};

export function HomePage({ user, users, products, accessLogs, lastSyncedAt, dashboard }: HomePageProps) {
  const metrics = getDashboardMetrics(products);
  const access = getAccessMetrics(accessLogs);
  const reportMetrics = getReportMetrics(products);
  const recentProducts = [...products].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  const criticalProducts = products
    .filter((product) => product.quantity <= product.minQuantity)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  if (!isAdmin(user)) {
    return (
      <>
        <section className="hero-banner panel staff-highlight">
          <div className="hero-copy-block">
            <p className="eyebrow">Operação do turno</p>
            <h2>Reposição clara, leitura rápida e foco no piso de loja.</h2>
            <p className="hero-copy">Acompanhe itens críticos, veja atualizações recentes e trabalhe com menos ruído.</p>
          </div>
          <div className="hero-metric-stack">
            <div className="metric-box"><span>Reposições urgentes</span><strong>{metrics.itensCriticos}</strong></div>
            <div className="metric-box"><span>Produtos ativos</span><strong>{metrics.totalProdutos}</strong></div>
            <div className="metric-box"><span>Últimas visitas</span><strong>{access.totalPageViews}</strong></div>
          </div>
        </section>

        <section className="cards">
          <MetricCard label="Itens em estoque" value={metrics.estoqueTotal} tone="accent" />
          <MetricCard label="Categorias ativas" value={new Set(products.map((product) => product.category ?? 'Sem categoria')).size} />
          <MetricCard label="Criticos agora" value={metrics.itensCriticos} tone="warning" />
          <MetricCard label="Valor em risco" value={money(dashboard?.financialValueAtRisk ?? 0)} tone="warning" />
        </section>

        <section className="content-grid two-columns">
          <StockList title="Lista de reposicao" eyebrow="Checklist" products={criticalProducts} empty="Sem reposicoes pendentes no momento." />
          <RecentProducts products={recentProducts} />
        </section>
        <SmartDashboardSections dashboard={dashboard} />
      </>
    );
  }

  return (
    <>
      <section className="hero-banner panel admin-highlight">
        <div className="hero-copy-block">
          <p className="eyebrow">Central administrativa</p>
          <h2>Visão executiva de estoque, equipe e performance.</h2>
          <p className="hero-copy">Leitura de valor imobilizado, risco de ruptura, pulso da equipe e navegação clara.</p>
        </div>
        <div className="hero-metric-stack">
          <div className="metric-box"><span>Valor em estoque</span><strong>{money(metrics.valorTotal)}</strong></div>
          <div className="metric-box"><span>Usuários ativos</span><strong>{access.activeUsers}</strong></div>
          <div className="metric-box"><span>Categoria líder</span><strong>{reportMetrics.orderedCategories[0]?.[0] ?? 'Sem dados'}</strong></div>
        </div>
      </section>

      <section className="cards">
        <MetricCard label="Produtos cadastrados" value={metrics.totalProdutos} tone="accent" />
        <MetricCard label="Unidades em estoque" value={metrics.estoqueTotal} />
        <MetricCard label="Usuários no sistema" value={users.length} />
        <MetricCard label="Itens críticos" value={metrics.itensCriticos} tone="warning" />
      </section>

      <SmartDashboardSections dashboard={dashboard} />

      <section className="content-grid admin-grid">
        <article className="panel">
          <div className="section-head">
            <div><p className="eyebrow">Inventário</p><h3>Últimas atualizações</h3></div>
            <span className="info-chip">{lastSyncedAt ? `Sync ${dateTime(lastSyncedAt)}` : 'Sync ativo'}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Produto</th><th>Estoque</th><th>Atualizado em</th></tr></thead>
              <tbody>
                {recentProducts.length > 0 ? recentProducts.map((product) => (
                  <tr key={product.id}><td>{product.name}</td><td>{product.quantity}</td><td>{dateTime(product.updatedAt)}</td></tr>
                )) : <tr><td colSpan={3}>Nenhum produto cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="section-head">
            <div><p className="eyebrow">Equipe</p><h3>Pulso dos usuarios</h3></div>
            <span className="info-chip">Admin</span>
          </div>
          <div className="stack">
            {users.slice(0, 5).map((item) => (
              <article className="activity-item" key={item.id}>
                <div><strong>{item.name}</strong><p>{item.role === 'admin' ? 'Administrador' : 'Operador'} - {item.email}</p></div>
                <small>{item.lastLoginAt ? dateTime(item.lastLoginAt) : 'Sem login'}</small>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-head"><div><p className="eyebrow">Categorias</p><h3>Resumo por categoria</h3></div></div>
          <div className="summary-grid">
            {reportMetrics.orderedCategories.slice(0, 6).map(([category, count]) => (
              <div className="summary-chip" key={category}><strong>{category}</strong><span>{count} produtos</span></div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function StockList({ eyebrow, title, products, empty }: { eyebrow: string; title: string; products: Product[]; empty: string }) {
  return (
    <article className="panel">
      <div className="section-head">
        <div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>
        <span className="info-chip">Turno atual</span>
      </div>
      <div className="stack">
        {products.length > 0 ? products.map((product) => {
          const status = productStatus(product);
          return (
            <article className="report-card" key={product.id}>
              <div className="row-between"><strong>{product.name}</strong><Badge label={status.label} tone={status.className} /></div>
              <span>{product.category ?? 'Sem categoria'} - {product.quantity} {product.unit ?? 'un'} em estoque</span>
            </article>
          );
        }) : <p className="empty">{empty}</p>}
      </div>
    </article>
  );
}

function RecentProducts({ products }: { products: Product[] }) {
  return (
    <article className="panel">
      <div className="section-head">
        <div><p className="eyebrow">Atualizacoes</p><h3>Movimento recente do estoque</h3></div>
        <span className="info-chip">Ao vivo</span>
      </div>
      <div className="stack">
        {products.length > 0 ? products.map((product) => (
          <article className="activity-item" key={product.id}>
            <div><strong>{product.name}</strong><p>{product.category ?? 'Sem categoria'}</p></div>
            <small>{dateTime(product.updatedAt)}</small>
          </article>
        )) : <p className="empty">Nenhum produto cadastrado.</p>}
      </div>
    </article>
  );
}
