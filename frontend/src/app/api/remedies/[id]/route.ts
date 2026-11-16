import { NextResponse } from "next/server";
import remedyRelatedJson from "@/data/generated/remedy-related.json";
import { getNeoRemedyById } from "@/data/neoRemedies";
import { staticDataHeaders } from "@/lib/cacheHeaders";

export const revalidate = 3600;

const remedyRelated = remedyRelatedJson as Record<string, { id: string; name: string; abbr: string }[]>;

export function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return params.then(({ id }) => {
    const remedy = getNeoRemedyById().get(id);
    if (!remedy) {
      return NextResponse.json({ error: "Remedy not found" }, { status: 404 });
    }
    const relatedRemedies = remedyRelated[id] || [];
    return NextResponse.json(
      { remedy: { ...remedy, relatedRemedies } },
      { headers: staticDataHeaders },
    );
  });
}
