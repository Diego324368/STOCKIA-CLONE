import type { AccessLog } from '../types/models';
import { dateTime } from '../lib/format';

export function HistoryPage({ accessLogs }: { accessLogs: AccessLog[] }) {
  const history = accessLogs.slice(0, 120);

  return (
    <section className="panel">
      <div className="section-head"><div><p className="eyebrow">Auditoria</p><h3>Histórico de eventos</h3></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Detalhes</th></tr></thead>
          <tbody>
            {history.length > 0 ? history.map((log) => (
              <tr key={log.id}><td>{dateTime(log.timestamp)}</td><td>{log.userName}</td><td>{log.action}</td><td>{log.details ?? '-'}</td></tr>
            )) : <tr><td colSpan={4}>Sem histórico.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
