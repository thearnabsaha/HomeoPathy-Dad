const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/**
 * Fast, lightweight Bengali numeral formatter.
 * Converts ASCII digits (0-9) to Bengali digits (০-৯).
 */
export function toBengaliNumeral(n: number | string): string {
  return String(n).replace(/\d/g, (d) => BN_DIGITS[d.charCodeAt(0) - 48] || d);
}
