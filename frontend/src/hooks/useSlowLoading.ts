"use client";

import { useEffect, useState } from "react";

/** True when `loading` has stayed true for more than `ms` (default 2s). */
export function useSlowLoading(loading: boolean, ms: number = 2000): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const id = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(id);
  }, [loading, ms]);

  return slow;
}
