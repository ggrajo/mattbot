const ERROR_MAP: [RegExp, string][] = [
  [/RATE_LIMITED|rate.limit/i, 'Too many attempts. Please wait a moment.'],
  [/Internal Server Error/i, 'Something went wrong on our end. Please try again later.'],
  [/SMTP|smtp|mail.*fail/i, 'Something went wrong on our end. Please try again later.'],
  [/Network Error/i, 'Network error. Please check your connection and try again.'],
  [/timeout of \d+ms exceeded/i, 'Request timed out. Please try again.'],
];

export function friendlyError(raw: string): string {
  for (const [re, msg] of ERROR_MAP) {
    if (re.test(raw)) return msg;
  }
  return raw;
}
