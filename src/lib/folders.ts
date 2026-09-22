/**
 * Folder naming helpers.
 *
 * AI-suggested folders are normalized into a small, consistent, human-readable
 * set so the sidebar doesn't fill up with near-duplicates like
 * "work-stuff", "WORK", "Work Notes".
 */

export const CANONICAL_FOLDERS = [
  "Work",
  "Personal",
  "Ideas",
  "Projects",
  "Learning",
  "Health",
  "Finance",
  "Travel",
  "Reading",
  "Journal",
  "Uncategorized",
] as const;

const ALIASES: Record<string, string> = {
  job: "Work",
  career: "Work",
  office: "Work",
  business: "Work",
  meeting: "Work",
  meetings: "Work",
  worknotes: "Work",
  life: "Personal",
  home: "Personal",
  family: "Personal",
  misc: "Uncategorized",
  general: "Uncategorized",
  other: "Uncategorized",
  none: "Uncategorized",
  idea: "Ideas",
  brainstorm: "Ideas",
  brainstorming: "Ideas",
  thoughts: "Ideas",
  project: "Projects",
  study: "Learning",
  education: "Learning",
  school: "Learning",
  notes: "Learning",
  fitness: "Health",
  wellness: "Health",
  money: "Finance",
  budget: "Finance",
  finances: "Finance",
  trips: "Travel",
  books: "Reading",
  reading: "Reading",
  diary: "Journal",
  journalling: "Journal",
};

const SMALL_WORDS = new Set(["and", "or", "of", "the", "a", "an", "to", "in", "for", "on"]);

/**
 * Turn any raw folder string into a clean, Title Cased, human-readable name.
 * Collapses separators, trims noise words, and maps common aliases onto the
 * canonical folder set.
 */
export function normalizeFolderName(raw?: string | null): string {
  const cleaned = (raw || "")
    .replace(/[_\-/\\]+/g, " ")
    // split camelCase / PascalCase
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^\p{L}\p{N}\s&']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Uncategorized";

  const key = cleaned.toLowerCase().replace(/\s+/g, "");
  if (ALIASES[key]) return ALIASES[key];

  const canonical = CANONICAL_FOLDERS.find((f) => f.toLowerCase() === cleaned.toLowerCase());
  if (canonical) return canonical;

  const titled = cleaned
    .split(" ")
    .slice(0, 3)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");

  return titled.slice(0, 32) || "Uncategorized";
}
