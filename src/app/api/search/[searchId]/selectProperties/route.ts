import { NextResponse } from "next/server";
import { selectPropertiesSchema } from "@/lib/clientSearchSchema";
import { getSearchSession, saveSearchSession } from "@/lib/storage";

interface Params {
  params: { searchId: string };
}

export async function POST(req: Request, { params }: Params) {
  let ids: string[];
  try {
    const body = await req.json();
    ids = selectPropertiesSchema.parse(body).selectedPropertyIds;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Invalid payload" }, { status: 400 });
  }

  const session = await getSearchSession(params.searchId);
  if (!session) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 });
  }

  const invalid = ids.filter((id) => !session.evaluatedProperties.find((p) => p.id === id));
  if (invalid.length > 0) {
    return NextResponse.json({ error: "One or more property IDs are invalid" }, { status: 400 });
  }

  session.selectedPropertyIds = ids;
  await saveSearchSession(session);
  return NextResponse.json({ ok: true });
}
