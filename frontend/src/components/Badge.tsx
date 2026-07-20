type BadgeProps = {
  label: string;
  tone?: string;
};

export function Badge({ label, tone = 'ok' }: BadgeProps) {
  return <span className={`badge ${tone}`}>{label}</span>;
}
