import { NextResponse } from "next/server";
import { clientUpdateSchema } from "@/lib/clientSearchSchema";
import { getClientById, getSearchSession, deleteClientAndSearches, updateClient } from "@/lib/storage";

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

export async function PATCH(req: Request, { params }: Params) {
  let payload: { name: string; email: string; notes?: string };
  try {
    payload = clientUpdateSchema.parse(await req.json());
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Invalid payload" }, { status: 400 });
  }

  try {
    const updated = await updateClient(params.clientId, payload);
    return NextResponse.json({ client: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to update client" },
      { status: err?.message === "Client not found" ? 404 : 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await deleteClientAndSearches(params.clientId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to delete client" }, { status: 500 });
  }
}
