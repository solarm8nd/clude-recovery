const FALSE = /^(0|false|no|off)$/i;
const TRUE = /^(1|true|yes|on)$/i;
export function feature(name: string): boolean {
  const exact = process.env[`FEATURE_${name}`];
  if (exact) return TRUE.test(exact);
  const lower = process.env[`FEATURE_${name.toLowerCase()}`];
  if (lower) return TRUE.test(lower);
  if (TRUE.test(process.env.CLUDE_ENABLE_ALL_FEATURES || "")) return true;
  return false;
}
export default { feature };
