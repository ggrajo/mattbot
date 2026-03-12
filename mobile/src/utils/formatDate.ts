export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function formatDate(iso: string, tz?: string): string {
  const d = new Date(iso);
  try {
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: tz ?? getDeviceTimezone(),
      timeZoneName: 'short',
    });
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatDateTime(iso: string, tz?: string): string {
  const d = new Date(iso);
  try {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz ?? getDeviceTimezone(),
      timeZoneName: 'short',
    });
  } catch {
    return d.toLocaleString();
  }
}

export function formatDateTimeFull(iso: string, tz?: string): string {
  const d = new Date(iso);
  try {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz ?? getDeviceTimezone(),
      timeZoneName: 'short',
    });
  } catch {
    return d.toLocaleString();
  }
}

export function formatTime(iso: string, tz?: string): string {
  const d = new Date(iso);
  try {
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz ?? getDeviceTimezone(),
      timeZoneName: 'short',
    });
  } catch {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(iso);
}
