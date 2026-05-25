/**
 * Read the current school session's schoolId.
 * All module hooks use this rather than reading session directly.
 */

import { useMemo } from "react";
import { readStoredSchoolSession } from "@/lib/auth";

export function useSchoolId(): string {
  return useMemo(() => {
    const s = readStoredSchoolSession();
    return (s?.schoolInfo as { _id?: string } | undefined)?._id ?? "";
  }, []);
}
