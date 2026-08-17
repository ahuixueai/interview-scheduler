/** IANA 时区列表：优先用原生 Intl.supportedValuesOf，旧环境回退常用时区集合 */

const FALLBACK_ZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

export function supportedTimeZones(): string[] {
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      return Intl.supportedValuesOf("timeZone");
    }
  } catch {
    /* 旧环境降级 */
  }
  return FALLBACK_ZONES;
}
