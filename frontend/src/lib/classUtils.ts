import type { SchoolClass } from "@/lib/financeTypes";

/** Returns one entry per unique class name (first section's _id is kept). */
export const getUniqueClasses = (classes: SchoolClass[]): SchoolClass[] => {
  const seen = new Map<string, SchoolClass>();
  for (const cls of classes) {
    const key = cls.name.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, { ...cls, section: null });
  }
  return Array.from(seen.values());
};
