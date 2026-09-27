import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Manila is UTC+8 all year (no daylight saving), so Manila wall time is plain
// arithmetic on UTC. Deliberately not dayjs .tz(): that depends on the device's
// Intl timezone data, which differs between iOS and Android Hermes and put
// iPhone timestamps 8 hours ahead.
const MANILA_OFFSET_HOURS = 8;

/**
 * Formats a date to MySQL format (YYYY-MM-DD HH:mm:ss) in GMT+8 (Asia/Manila)
 */
export const formatToGMT8MySQL = (date: Date = new Date()): string => {
  return dayjs(date).utc().add(MANILA_OFFSET_HOURS, 'hour').format('YYYY-MM-DD HH:mm:ss');
};

/**
 * Formats a date to a display format (MM/DD/YYYY, HH:mm:ss AM/PM) in GMT+8
 */
export const formatToGMT8Display = (date: Date = new Date()): string => {
  return dayjs(date).utc().add(MANILA_OFFSET_HOURS, 'hour').format('MM/DD/YYYY, hh:mm:ss A');
};

/**
 * Gets just the date part (YYYY-MM-DD) in GMT+8
 */
export const getGMT8DateOnly = (date: Date = new Date()): string => {
  return dayjs(date).utc().add(MANILA_OFFSET_HOURS, 'hour').format('YYYY-MM-DD');
};

/**
 * Epoch milliseconds for a server timestamp stored as Manila wall time
 * ("YYYY-MM-DD HH:mm:ss"). A value that carries its own offset or "Z" is
 * already absolute and is parsed as-is.
 */
export const manilaTimeToEpoch = (value: string): number => {
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(value.trim())) return dayjs(value).valueOf();
  return dayjs.utc(value).subtract(MANILA_OFFSET_HOURS, 'hour').valueOf();
};
