"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Client, SearchSession } from "@/lib/types";

export default function ComposePage() {
  const params = useParams<{ searchId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SearchSession | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [cc, setCc] = useState("");
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
        setToEmail(data.session.finalEmail?.to || data.client.email || "");
        setCc((data.session.finalEmail?.cc || []).join(", "));
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
        body: JSON.stringify({ to: toEmail, cc, subject, body }),
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
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-[1px] shadow-lg">
        <div className="flex flex-col gap-4 rounded-[15px] bg-white/5 p-6 text-white backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-200">Compose</p>
              <h1 className="text-3xl font-semibold leading-tight">Client Email</h1>
              <p className="text-sm text-slate-200">
                Preloaded draft — tweak anything before sending.
              </p>
            </div>
            <div className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-right text-sm text-white">
              <div className="font-semibold">{client.name}</div>
              <div className="text-slate-200">{client.email}</div>
            </div>
          </div>
          <div className="grid gap-2 text-sm text-slate-100 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-slate-300">Location</p>
              <p className="font-medium">{session.preferredLocation}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-300">Properties chosen</p>
              <p className="font-medium">{session.selectedPropertyIds?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-300">Notes</p>
              <p className="font-medium truncate text-ellipsis">{session.clientNotes}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="grid gap-4 md:grid-cols-[1.5fr,1fr]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">To</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="client@email.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">CC</span>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">optional</span>
            </div>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Add multiple, separated by commas"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-800">Subject</span>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">Body</span>
            <span className="text-xs text-slate-500">Plain text — feel free to edit</span>
          </div>
          <textarea
            className="min-h-[260px] rounded-md border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        {message && <div className="text-sm text-slate-700">{message}</div>}
        <div className="flex justify-end">
          <button
            className="btn-primary"
            onClick={handleSend}
            disabled={sending || !subject || !body || !toEmail}
          >
            {sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="text-sm font-semibold text-slate-800">Included properties</div>
        <div className="grid gap-2">
          {session.selectedPropertyIds?.map((id) => {
            const prop = session.evaluatedProperties.find((p) => p.id === id);
            if (!prop) return null;
            return (
              <div
                key={id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm"
              >
                <div>
                  <div className="font-medium text-slate-900">{prop.address}</div>
                  <div className="text-slate-600">
                    {prop.city}, {prop.state} {prop.zipcode}
                  </div>
                </div>
                <div className="text-right text-slate-700">
                  <div className="font-semibold">${prop.price.toLocaleString()}</div>
                  <div className="text-xs">{prop.beds} bd / {prop.baths} ba</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
