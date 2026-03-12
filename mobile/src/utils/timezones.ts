export interface TimezoneEntry {
  value: string;
  label: string;
  offset: string;
}

export interface TimezoneSection {
  title: string;
  data: TimezoneEntry[];
}

function label(tz: string): string {
  return tz.replace(/_/g, ' ').replace(/\//g, ' / ');
}

export function tzLabel(tz: string): string {
  return label(tz);
}

export function getTimezoneAbbr(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart?.value ?? timezone;
  } catch {
    return timezone;
  }
}

const americas: string[] = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Phoenix', 'America/Toronto',
  'America/Vancouver', 'America/Winnipeg', 'America/Halifax', 'America/St_Johns',
  'America/Edmonton', 'America/Regina', 'America/Mexico_City', 'America/Cancun',
  'America/Monterrey', 'America/Guatemala', 'America/Costa_Rica', 'America/Panama',
  'America/Bogota', 'America/Lima', 'America/Caracas', 'America/Santiago',
  'America/Buenos_Aires', 'America/Sao_Paulo', 'America/Manaus', 'America/Havana',
  'America/Jamaica', 'America/Puerto_Rico', 'America/Santo_Domingo',
  'America/Port-au-Prince', 'America/Asuncion', 'America/Montevideo',
  'America/Guayaquil', 'America/La_Paz', 'America/Barbados', 'America/Belize',
  'America/Martinique', 'America/Curacao',
];

const europe: string[] = [
  'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam', 'Europe/Brussels',
  'Europe/Zurich', 'Europe/Vienna', 'Europe/Stockholm', 'Europe/Oslo',
  'Europe/Copenhagen', 'Europe/Helsinki', 'Europe/Warsaw', 'Europe/Prague',
  'Europe/Budapest', 'Europe/Bucharest', 'Europe/Sofia', 'Europe/Athens',
  'Europe/Istanbul', 'Europe/Moscow', 'Europe/Kiev', 'Europe/Lisbon',
  'Europe/Belgrade', 'Europe/Zagreb', 'Europe/Bratislava', 'Europe/Ljubljana',
  'Europe/Tallinn', 'Europe/Riga', 'Europe/Vilnius',
];

const asia: string[] = [
  'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Muscat',
  'Asia/Bahrain', 'Asia/Tehran', 'Asia/Kabul', 'Asia/Karachi', 'Asia/Kolkata',
  'Asia/Colombo', 'Asia/Dhaka', 'Asia/Kathmandu', 'Asia/Almaty', 'Asia/Tashkent',
  'Asia/Yekaterinburg', 'Asia/Novosibirsk', 'Asia/Krasnoyarsk', 'Asia/Irkutsk',
  'Asia/Yakutsk', 'Asia/Vladivostok', 'Asia/Magadan', 'Asia/Kamchatka',
  'Asia/Bangkok', 'Asia/Ho_Chi_Minh', 'Asia/Jakarta', 'Asia/Singapore',
  'Asia/Kuala_Lumpur', 'Asia/Manila', 'Asia/Hong_Kong', 'Asia/Shanghai',
  'Asia/Taipei', 'Asia/Seoul', 'Asia/Tokyo', 'Asia/Brunei',
];

const africa: string[] = [
  'Africa/Cairo', 'Africa/Lagos', 'Africa/Nairobi', 'Africa/Johannesburg',
  'Africa/Casablanca', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Dar_es_Salaam',
  'Africa/Khartoum', 'Africa/Algiers', 'Africa/Tunis', 'Africa/Tripoli',
  'Africa/Harare', 'Africa/Maputo', 'Africa/Kampala',
];

const pacific: string[] = [
  'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Guam', 'Pacific/Port_Moresby',
  'Pacific/Tongatapu', 'Pacific/Apia', 'Pacific/Noumea', 'Pacific/Tahiti',
  'Pacific/Chatham', 'Pacific/Majuro',
];

const australia: string[] = [
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane',
  'Australia/Perth', 'Australia/Adelaide', 'Australia/Darwin',
];

const other: string[] = [
  'Antarctica/Palmer', 'Indian/Maldives', 'Indian/Mauritius',
  'Indian/Reunion', 'Atlantic/Reykjavik',
];

function getOffsetLabel(tz: string): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(now);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart?.value ?? '';
  } catch {
    return '';
  }
}

function toEntries(zones: string[]): TimezoneEntry[] {
  return zones.map((tz) => ({ value: tz, label: label(tz), offset: getOffsetLabel(tz) }));
}

export const TIMEZONE_SECTIONS: TimezoneSection[] = [
  { title: 'Americas', data: toEntries(americas) },
  { title: 'Europe', data: toEntries(europe) },
  { title: 'Asia', data: toEntries(asia) },
  { title: 'Africa', data: toEntries(africa) },
  { title: 'Pacific', data: toEntries(pacific) },
  { title: 'Australia', data: toEntries(australia) },
  { title: 'Other', data: toEntries(other) },
];
