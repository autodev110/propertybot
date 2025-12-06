import { NextResponse } from "next/server";
import { getSearchSession, getClientById, saveSearchSession } from "@/lib/storage";
import { generateEmailDraftForSelectedProperties } from "@/lib/emailComposer";

interface Params {
  params: { searchId: string };
}

export async function POST(_req: Request, { params }: Params) {
  const session = await getSearchSession(params.searchId);
  if (!session) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 });
  }
  if (!session.selectedPropertyIds || session.selectedPropertyIds.length === 0) {
    return NextResponse.json({ error: "No properties selected" }, { status: 400 });
  }
  const client = await getClientById(session.clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const selectedProps = session.evaluatedProperties.filter((p) =>
    session.selectedPropertyIds?.includes(p.id)
  );
  if (selectedProps.length === 0) {
    return NextResponse.json({ error: "No selected properties available" }, { status: 400 });
  }

  try {
    const draft = await generateEmailDraftForSelectedProperties(
      {
        name: client.name,
        email: client.email,
        preferredLocation: session.preferredLocation,
        clientNotes: session.clientNotes,
      },
      selectedProps
    );
    session.finalEmail = {
      to: client.email,
      cc: [],
      subject: draft.subject,
      body: draft.body,
      includedPropertyIds: selectedProps.map((p) => p.id),
      sentAt: "",
    };
    await saveSearchSession(session);
    return NextResponse.json(draft);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to generate email draft" },
      { status: 500 }
    );
  }
}
