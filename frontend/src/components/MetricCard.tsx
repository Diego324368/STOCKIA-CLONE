type MetricCardProps = {
  label: string;
  value: string | number;
  tone?: 'default' | 'accent' | 'warning';
};

export function MetricCard({ label, value, tone = 'default' }: MetricCardProps) {
  return (
    <article className={`card ${tone === 'accent' ? 'accent-card' : ''} ${tone === 'warning' ? 'warning' : ''}`}>
      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
}
