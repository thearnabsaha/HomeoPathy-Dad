import { NextResponse } from "next/server";
import childrenMap from "@/data/generated/children.json";
import { staticDataHeaders } from "@/lib/cacheHeaders";

export const revalidate = 3600;

const children = childrenMap as Record<string, { children: unknown[]; type: string }>;

export function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return params.then(({ id }) => {
    const hit = children[id];
    if (hit) {
      return NextResponse.json(hit, { headers: staticDataHeaders });
    }
    return NextResponse.json({ children: [], type: "unknown" }, { headers: staticDataHeaders });
  });
}
