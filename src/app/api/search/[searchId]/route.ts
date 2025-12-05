import { NextResponse } from "next/server";
import { getSearchSession, getClientById, deleteSearchSession, saveClient } from "@/lib/storage";

interface Params {
  params: { searchId: string };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getSearchSession(params.searchId);
  if (!session) {
    return NextResponse.json({ error: "Search session not found" }, { status: 404 });
  }
  const client = await getClientById(session.clientId);
  return NextResponse.json({ session, client });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSearchSession(params.searchId);
  if (!session) {
    return NextResponse.json({ error: "Search session not found" }, { status: 404 });
  }

  try {
    await deleteSearchSession(params.searchId);
    const client = await getClientById(session.clientId);
    if (client) {
      client.searches = client.searches.filter((s) => s.id !== params.searchId);
      await saveClient(client);
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to delete search" }, { status: 500 });
  }
}
