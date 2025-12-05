"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Client, SearchSession } from "@/lib/types";

export default function ComposePage() {
  const params = useParams<{ searchId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SearchSession | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/${params.searchId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load search");
        setSession(data.session);
        setClient(data.client);
        setSubject(data.session.finalEmail?.subject || "");
        setBody(data.session.finalEmail?.body || "");
      } catch (err: any) {
        setMessage(err?.message || "Failed to load search");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.searchId]);

  const handleSend = async () => {
    if (!session) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/search/${session.id}/sendEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");
      setMessage("Email sent!");
      router.refresh();
    } catch (err: any) {
      setMessage(err?.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!session || !client) return <div>{message || "Not found"}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">Compose Email</h1>
        <div className="text-sm text-slate-700">
          To: <span className="font-medium">{client.email}</span>
        </div>
      </div>

      <div className="card space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-800">Subject</span>
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-800">Body</span>
          <textarea
            className="min-h-[260px] rounded-md border border-slate-300 px-3 py-2"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        {message && <div className="text-sm text-slate-700">{message}</div>}
        <div className="flex justify-end">
          <button className="btn-primary" onClick={handleSend} disabled={sending || !subject || !body}>
            {sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>

      <div className="card space-y-2">
        <div className="text-sm font-semibold text-slate-800">Included properties</div>
        <ul className="text-sm text-slate-700 list-disc pl-5">
          {session.selectedPropertyIds?.map((id) => {
            const prop = session.evaluatedProperties.find((p) => p.id === id);
            if (!prop) return null;
            return (
              <li key={id}>
                {prop.address} — ${prop.price.toLocaleString()} ({prop.beds} bd / {prop.baths} ba)
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
