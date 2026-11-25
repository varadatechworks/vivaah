export type SocialCategory = "pages" | "communities" | "interests" | "creators" | "contentThemes";
export type SharedEntity = { id: string; label: string; category: SocialCategory; source: "provider" | "member-curated"; fetchedAt?: string };
export type SocialMemberData = { memberId: string; allowedToShare: Partial<Record<SocialCategory, boolean>>; entities: SharedEntity[] };
export type SocialOverlapResult = { category: SocialCategory; count: number; items: Array<{ id: string; label: string }>; sourceTypes: Array<"provider" | "member-curated"> };

/**
 * Computes overlap only when both members have enabled sharing for that category.
 * Callers must obtain provider data through official APIs and enforce access control
 * before invoking this domain helper. It does not infer sensitive beliefs.
 */
export function calculateSocialOverlap(a: SocialMemberData, b: SocialMemberData, category: SocialCategory): SocialOverlapResult {
  if (a.memberId === b.memberId) throw new Error("Social overlap requires two distinct members");
  if (a.allowedToShare[category] !== true || b.allowedToShare[category] !== true) {
    return { category, count: 0, items: [], sourceTypes: [] };
  }
  const right = new Map(b.entities.filter(x => x.category === category).map(x => [x.id, x]));
  const unique = new Map<string, { id: string; label: string; source: "provider" | "member-curated" }>();
  for (const item of a.entities) {
    if (item.category !== category || !right.has(item.id)) continue;
    const other = right.get(item.id)!;
    unique.set(item.id, { id: item.id, label: item.label || other.label, source: item.source });
  }
  const items = [...unique.values()].sort((x, y) => x.label.localeCompare(y.label));
  return { category, count: items.length, items: items.map(({id,label}) => ({id,label})), sourceTypes: [...new Set(items.map(x => x.source))] };
}
