import type { AccessLog } from '../types/models';
import { MetricCard } from '../components/MetricCard';
import { dateTime } from '../lib/format';
import { getAccessMetrics } from '../lib/stock';

export function MetricsPage({ accessLogs }: { accessLogs: AccessLog[] }) {
  const metrics = getAccessMetrics(accessLogs);

  return (
    <>
      <section className="cards">
        <MetricCard label="Logins (7 dias)" value={metrics.recentLogins} tone="accent" />
        <MetricCard label="Usuarios ativos (30 dias)" value={metrics.activeUsers} />
        <MetricCard label="Visualizacoes de paginas" value={metrics.totalPageViews} />
        <MetricCard label="Eventos registrados" value={accessLogs.length} />
      </section>

      <section className="content-grid two-columns">
        <article className="panel">
          <div className="section-head"><div><p className="eyebrow">Trafego</p><h3>Paginas mais acessadas</h3></div></div>
          <ul className="stats-list">
            {metrics.topPages.length > 0 ? metrics.topPages.map(([page, count]) => <li key={page}><span>{page}</span><strong>{count}</strong></li>) : <li><span>Sem dados</span><strong>0</strong></li>}
          </ul>
        </article>

        <article className="panel">
          <div className="section-head"><div><p className="eyebrow">Timeline</p><h3>Ultimos 20 eventos</h3></div></div>
          <ul className="timeline">
            {accessLogs.slice(0, 20).map((log) => (
              <li key={log.id}><p><strong>{log.userName}</strong> executou <strong>{log.action}</strong></p><small>{dateTime(log.timestamp)} {log.details ? `- ${log.details}` : ''}</small></li>
            ))}
          </ul>
        </article>
      </section>
    </>
  );
}
