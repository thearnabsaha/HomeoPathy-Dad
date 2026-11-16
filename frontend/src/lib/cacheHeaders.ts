export const STATIC_DATA_SMAXAGE = 3600;
export const STATIC_DATA_SWR = 86400;
export const SEARCH_SMAXAGE = 600;
export const SEARCH_SWR = 3600;

export function dataCacheHeaders(
  sMaxAge: number = STATIC_DATA_SMAXAGE,
  swr: number = STATIC_DATA_SWR,
): Record<string, string> {
  const value = `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`;
  // Vercel strips s-maxage from Cache-Control unless a CDN-specific header is also set.
  // Next.js also overwrites Cache-Control on dynamic Route Handlers; the CDN headers survive.
  return {
    "Cache-Control": value,
    "CDN-Cache-Control": value,
    "Vercel-CDN-Cache-Control": value,
  };
}

export const staticDataHeaders = dataCacheHeaders();
export const searchDataHeaders = dataCacheHeaders(SEARCH_SMAXAGE, SEARCH_SWR);
