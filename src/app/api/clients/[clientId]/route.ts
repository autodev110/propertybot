import { NextResponse } from "next/server";
import { getClientById, getSearchSession, deleteClientAndSearches } from "@/lib/storage";

interface Params {
  params: { clientId: string };
}

export async function GET(_req: Request, { params }: Params) {
  const client = await getClientById(params.clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  const sessions = await Promise.all(
    client.searches.map((s) => getSearchSession(s.id))
  );
  return NextResponse.json({
    client,
    sessions: sessions.filter(Boolean),
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await deleteClientAndSearches(params.clientId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to delete client" }, { status: 500 });
  }
}
