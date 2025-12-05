import { NextResponse } from "next/server";
import { listClients } from "@/lib/storage";

export async function GET() {
  const clients = await listClients();
  return NextResponse.json({ clients });
}
