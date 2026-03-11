export function getDeviceTimezone(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz && tz !== 'GMT' && (tz.includes('/') || tz === 'UTC')) return tz;
  return 'UTC';
}

let _userTimezone: string | null = null;

export function setUserTimezone(tz: string) {
  _userTimezone = tz;
}

export function getUserTimezone(): string {
  return _userTimezone || getDeviceTimezone();
}

export function formatDate(date: string | Date, tz?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const timeZone = tz || getUserTimezone();
  try {
    return d.toLocaleDateString('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatRelative(date: string | Date, tz?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d, tz);
}

export function formatTime(date: string | Date, tz?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const timeZone = tz || getUserTimezone();
  try {
    return d.toLocaleTimeString('en-US', { timeZone, hour: '2-digit', minute: '2-digit' });
  } catch {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export function formatDateTime(date: string | Date, tz?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const timeZone = tz || getUserTimezone();
  try {
    return d.toLocaleString('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d.toLocaleString();
  }
}
