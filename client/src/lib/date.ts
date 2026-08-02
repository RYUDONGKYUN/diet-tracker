export function todayStr(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function dDay(targetDate: string): number {
  const today = new Date(todayStr());
  const target = new Date(targetDate);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function mostRecentMonday(): string {
  const d = new Date(todayStr());
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function formatDDay(targetDate: string | null): string | null {
  if (!targetDate) return null;
  const diff = dDay(targetDate);
  if (diff < 0) return "만료";
  if (diff === 0) return "D-day";
  return `D-${diff}`;
}
