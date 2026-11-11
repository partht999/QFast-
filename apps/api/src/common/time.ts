export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function addCalendarDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function inclusiveDays(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

export function localDate(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export function timeZoneOffsetMs(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const hour = read('hour') === 24 ? 0 : read('hour');
  const asUtc = Date.UTC(read('year'), read('month') - 1, read('day'), hour, read('minute'), read('second'));
  return asUtc - instant.getTime();
}

/** UTC instant of local midnight on isoDate. A second offset pass follows DST transitions. */
export function zonedStartUtc(isoDate: string, timeZone: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  let offset = timeZoneOffsetMs(utcMidnight, timeZone);
  let result = new Date(utcMidnight.getTime() - offset);
  offset = timeZoneOffsetMs(result, timeZone);
  result = new Date(utcMidnight.getTime() - offset);
  return result;
}

export function safeTimeZone(value: string | null | undefined) {
  const candidate = value?.trim() || 'Asia/Kolkata';
  try {
    Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return 'Asia/Kolkata';
  }
}

/** Local calendar day for a business, as a half-open UTC interval [start, end). */
export function businessDayRange(timeZone: string, now = new Date()) {
  const zone = safeTimeZone(timeZone);
  const date = localDate(now, zone);
  return {
    timeZone: zone,
    date,
    start: zonedStartUtc(date, zone),
    end: zonedStartUtc(addCalendarDays(date, 1), zone),
  };
}
