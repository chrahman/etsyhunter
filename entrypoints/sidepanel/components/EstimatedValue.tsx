interface EstimatedValueProps {
  value: string;
  prefix?: boolean;
  className?: string;
}

export function EstimatedValue({ value, prefix = true, className = '' }: EstimatedValueProps) {
  return (
    <span className={`font-semibold ${className}`}>
      {prefix && <span className="text-xs font-normal text-muted">Est. </span>}
      {value}
    </span>
  );
}
