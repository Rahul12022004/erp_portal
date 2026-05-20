import type { SchoolClass } from "@/modules/finance/types";

/** Returns one entry per unique class name (first section's _id is kept). */
export const getUniqueClasses = (classes: SchoolClass[]): SchoolClass[] => {
  const seen = new Map<string, SchoolClass>();
  for (const cls of classes) {
    const key = cls.name.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, { ...cls, section: null });
  }
  return Array.from(seen.values());
};

/** Returns ALL class _ids that share the given name (across sections). */
export const getClassIdsForName = (classes: SchoolClass[], name: string): string[] => {
  const key = name.trim().toLowerCase();
  return classes.filter((c) => c.name.trim().toLowerCase() === key).map((c) => c._id);
};
