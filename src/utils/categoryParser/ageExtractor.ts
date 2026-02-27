
// Age range extraction patterns
const agePatterns = [
  { pattern: /(\d+)-(\d+)\s*(?:years?|yrs?|months?)/i, format: (m: RegExpMatchArray) => `${m[1]}-${m[2]} years` },
  { pattern: /(\d+)\+?\s*(?:years?|yrs?)/i, format: (m: RegExpMatchArray) => `${m[1]}+ years` },
  { pattern: /(\d+)\s*(?:months?|mo)/i, format: (m: RegExpMatchArray) => `${Math.ceil(parseInt(m[1]) / 12)} years` },
  { pattern: /toddler/i, format: () => '1-3 years' },
  { pattern: /baby|infant/i, format: () => '0-2 years' },
  { pattern: /preschool/i, format: () => '3-5 years' },
  { pattern: /school age/i, format: () => '6-12 years' },
];

export function extractAgeRange(text: string): string {
  for (const { pattern, format } of agePatterns) {
    const match = text.match(pattern);
    if (match) {
      return format(match);
    }
  }
  return "All ages";
}
