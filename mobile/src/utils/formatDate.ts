export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function getTimezoneAbbr(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value ?? '';
  } catch {
    return '';
  }
}

export function formatDate(date: string | Date, timezone?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(timezone ? { timeZone: timezone } : {}),
  };
  try {
    const formatted = d.toLocaleDateString('en-US', opts);
    if (timezone) {
      const abbr = getTimezoneAbbr(timezone);
      return abbr ? `${formatted} ${abbr}` : formatted;
    }
    return formatted;
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatDateTime(date: string | Date, timezone?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timezone ? { timeZone: timezone } : {}),
  };
  try {
    const formatted = d.toLocaleDateString('en-US', opts);
    if (timezone) {
      const abbr = getTimezoneAbbr(timezone);
      return abbr ? `${formatted} ${abbr}` : formatted;
    }
    return formatted;
  } catch {
    return d.toLocaleString();
  }
}

export function formatDateTimeFull(date: string | Date, timezone?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...(timezone ? { timeZone: timezone } : {}),
  };
  try {
    const formatted = d.toLocaleDateString('en-US', opts);
    if (timezone) {
      const abbr = getTimezoneAbbr(timezone);
      return abbr ? `${formatted} ${abbr}` : formatted;
    }
    return formatted;
  } catch {
    return d.toLocaleString();
  }
}

export function formatTime(date: string | Date, timezone?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const opts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timezone ? { timeZone: timezone } : {}),
  };
  try {
    const formatted = d.toLocaleTimeString('en-US', opts);
    if (timezone) {
      const abbr = getTimezoneAbbr(timezone);
      return abbr ? `${formatted} ${abbr}` : formatted;
    }
    return formatted;
  } catch {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export function formatRelativeTime(date: string | Date, timezone?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(date, timezone);
}

/** @deprecated Use formatRelativeTime instead */
export const formatRelative = formatRelativeTime;
