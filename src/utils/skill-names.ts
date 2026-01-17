export function normalizeSkillNames(input: string[] | string | undefined): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : [input];
  const names = raw.flatMap((name) => name.split(','));
  const cleaned = names.map((name) => name.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
}
