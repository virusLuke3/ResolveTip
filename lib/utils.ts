export function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

export function clamp(min: number, max: number, value: number) {
  return Math.min(max, Math.max(min, value));
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}

export function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function shortHash(prefix: string) {
  return `${prefix}${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

export function formatUsdt(value: number) {
  return `${value.toFixed(1)} USDt`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function initials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}
