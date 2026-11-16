import { NextResponse } from "next/server";
import chaptersPayload from "@/data/generated/chapters-list.json";
import { staticDataHeaders } from "@/lib/cacheHeaders";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  return NextResponse.json(chaptersPayload, { headers: staticDataHeaders });
}
