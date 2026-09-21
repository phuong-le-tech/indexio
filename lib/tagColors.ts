export const TAG_COLOR_FAMILIES = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;

export type TagColorFamily = (typeof TAG_COLOR_FAMILIES)[number];

export function isTagColorFamily(value: string): value is TagColorFamily {
  return (TAG_COLOR_FAMILIES as readonly string[]).includes(value);
}

export interface TagColor {
  bg: string;
  border: string;
  text: string;
}

// Carried over 1:1 from the "Category" select field of the user's Notion
// database ("Tech Ressources"), so tags that match a known Notion category
// name keep the exact color they have there. Notion's own "default" color
// renders as neutral gray in their UI, so it maps to our gray family here.
const KNOWN_TAG_COLORS: Record<string, TagColorFamily> = {
  "ui/ux design": "blue",
  "coding practice": "green",
  "learning resources": "yellow",
  "ai/ml": "purple",
  "cloud/devops": "blue",
  "development tools": "orange",
  "reference/apis": "pink",
  community: "red",
  "github projects": "gray",
  idea: "gray",
  form: "brown",
  "no-code/low-code": "brown",
  prod: "gray",
  vps: "brown",
  serverless: "yellow",
  bdd: "red",
  animation: "yellow",
  seo: "pink",
  analytics: "gray",
  marketing: "orange",
  affilation: "red",
  copywriting: "gray",
  security: "gray",
  monitoring: "yellow",
  rgpd: "brown",
  legal: "gray",
  payment: "gray",
};

function hashToFamily(name: string): TagColorFamily {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % TAG_COLOR_FAMILIES.length;
  return TAG_COLOR_FAMILIES[index];
}

// User overrides (set via the /tags management page), keyed by lowercased
// tag name. Populated client-side whenever tags are fetched - see
// setTagColorOverrides(). Module-level state is fine here: this is a
// client-only, single-user app with no SSR data to keep in sync.
let overrides: Record<string, TagColorFamily> = {};

export function setTagColorOverrides(
  tags: { name: string; color?: string | null }[]
): void {
  const next: Record<string, TagColorFamily> = {};
  for (const tag of tags) {
    if (tag.color && isTagColorFamily(tag.color)) {
      next[tag.name.trim().toLowerCase()] = tag.color;
    }
  }
  overrides = next;
}

export function getFamilyColor(family: TagColorFamily): TagColor {
  return {
    bg: `var(--tag-${family}-bg)`,
    border: `var(--tag-${family}-border)`,
    text: `var(--tag-${family}-text)`,
  };
}

export function getTagColor(name: string): TagColor {
  const key = name.trim().toLowerCase();
  const family = overrides[key] ?? KNOWN_TAG_COLORS[key] ?? hashToFamily(name);
  return getFamilyColor(family);
}
