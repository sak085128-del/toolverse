import meta from "./meta.json";
import type { CategoryMeta, ToolImpl, ToolMeta } from "./types";

export const CATEGORIES = meta.categories as unknown as CategoryMeta[];
export const TOOL_META = meta.tools as unknown as ToolMeta[];

export function toolBySlug(slug: string): ToolMeta | undefined {
  return TOOL_META.find((t) => t.slug === slug);
}

export const toolModules = import.meta.glob<{ default: Record<string, ToolImpl> }>("./impl/*.ts");

export async function loadTool(slug: string): Promise<ToolImpl | null> {
  for (const loader of Object.values(toolModules)) {
    const mod = await loader();
    const impl = mod?.default?.[slug];
    if (impl) return impl;
  }
  return null;
}

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function toolsByCategory(id: string): ToolMeta[] {
  return TOOL_META.filter((t) => t.category === id);
}

export function searchTools(q: string, limit = 30): ToolMeta[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored = TOOL_META.map((t) => {
    let score = 0;
    for (const term of terms) {
      if (t.title.toLowerCase().startsWith(term)) score += 10;
      else if (t.title.toLowerCase().includes(term)) score += 5;
      else if (t.desc.toLowerCase().includes(term)) score += 2;
      else score -= 3;
    }
    return { t, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.t);
}