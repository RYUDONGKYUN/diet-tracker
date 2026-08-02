interface Props {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
}

export default function MacroBar({ label, consumed, target, unit = "g" }: Props) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const over = consumed > target;
  return (
    <div className="macro-row">
      <div className="macro-label">
        <span>{label}</span>
        <span>
          {Math.round(consumed)} / {Math.round(target)}
          {unit}
        </span>
      </div>
      <div className="macro-bar-track">
        <div className={`macro-bar-fill${over ? " over" : ""}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
