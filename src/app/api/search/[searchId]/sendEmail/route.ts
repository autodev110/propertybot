import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { emailDraftInputSchema } from "@/lib/clientSearchSchema";
import {
  getSearchSession,
  getClientById,
  saveSearchSession,
  updateSearchSummaryEmailSent,
  logEmailSend,
} from "@/lib/storage";

interface Params {
  params: { searchId: string };
}

export async function POST(req: Request, { params }: Params) {
  let subject: string;
  let body: string;
  try {
    const json = await req.json();
    const parsed = emailDraftInputSchema.parse(json);
    subject = parsed.subject;
    body = parsed.body;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Invalid payload" }, { status: 400 });
  }

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

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = user;

  if (!user || !pass) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    // Gmail app password auth
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: client.email,
      subject,
      text: body,
    });

    session.finalEmail = {
      subject,
      body,
      includedPropertyIds: session.selectedPropertyIds,
      sentAt: new Date().toISOString(),
      messageId: info.messageId,
    };
    await saveSearchSession(session);
    await updateSearchSummaryEmailSent(client.id, session.id, true);
    await logEmailSend({
      clientId: client.id,
      searchId: session.id,
      subject,
      body,
      includedPropertyIds: session.selectedPropertyIds,
      sentAt: session.finalEmail.sentAt,
      messageId: info.messageId,
    });

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to send email" },
      { status: 500 }
    );
  }
}
