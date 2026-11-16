import { NextResponse } from "next/server";
import remedyList from "@/data/generated/remedy-list.json";
import { staticDataHeaders } from "@/lib/cacheHeaders";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  return NextResponse.json(remedyList, { headers: staticDataHeaders });
}
