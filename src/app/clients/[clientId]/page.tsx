"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Client, SearchSession } from "@/lib/types";

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<SearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSessionId, setConfirmingSessionId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/clients/${params.clientId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load client");
        setClient(data.client);
        setForm({
          name: data.client.name || "",
          email: data.client.email || "",
          notes: data.client.notes || "",
        });
        setSessions(data.sessions || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load client");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.clientId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);
    setSaveMessage(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update client");
      setClient(data.client);
      setForm({
        name: data.client.name || "",
        email: data.client.email || "",
        notes: data.client.notes || "",
      });
      setSaveMessage("Client details saved");
    } catch (err: any) {
      setSaveMessage(err?.message || "Failed to save client");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!client) return <div>Client not found</div>;

  const handleDeleteSession = async () => {
    if (!confirmingSessionId) return;
    setActionMessage(null);
    try {
      const res = await fetch(`/api/search/${confirmingSessionId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete search");
      setSessions((prev) => prev.filter((s) => s.id !== confirmingSessionId));
      setActionMessage("Search session deleted.");
    } catch (err: any) {
      setActionMessage(err?.message || "Failed to delete search");
    } finally {
      setConfirmingSessionId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-[1px] shadow-lg">
        <div className="flex flex-col justify-between gap-4 rounded-[15px] bg-white/5 p-6 text-white backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-200">Client Profile</p>
              <h1 className="text-3xl font-semibold leading-tight">{form.name || client.name}</h1>
              <div className="text-sm text-slate-200">{form.email}</div>
              <div className="text-xs text-slate-300">
                Joined {new Date(client.createdAt).toLocaleString()}
              </div>
            </div>
            <a className="btn-secondary border border-white/20 bg-white/10 text-white hover:bg-white/20" href="/clients">
              Back to clients
            </a>
          </div>
          <div className="text-sm text-slate-100">
            {form.notes ? form.notes : "Add a quick note so you remember preferences for future searches."}
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-800">Contact & notes</div>
            <p className="text-xs text-slate-500">Edit name, email, or internal notes and save.</p>
          </div>
          {saveMessage && <div className="text-xs text-slate-600">{saveMessage}</div>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">Name</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              name="name"
              value={form.name}
              onChange={handleInputChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">Email</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              name="email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-800">Notes</span>
          <textarea
            className="min-h-[100px] rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            name="notes"
            value={form.notes}
            onChange={handleInputChange}
            placeholder="Preferences, milestones, reminders..."
          />
        </label>
        <div className="flex items-center justify-end gap-3">
          {actionMessage && <div className="text-xs text-slate-600">{actionMessage}</div>}
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !form.name || !form.email}
          >
            {saving ? "Saving..." : "Save client"}
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">Search sessions</div>
          <span className="text-xs text-slate-500">{sessions.length} total</span>
        </div>
        {sessions.length === 0 && <div className="text-sm text-slate-600">No searches yet.</div>}
        <div className="grid gap-3">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-lg border border-slate-200 p-3 shadow-sm">
              <div className="flex flex-col gap-1 text-sm">
                <div className="font-semibold text-slate-900">
                  {session.preferredLocation}
                </div>
                <div className="text-slate-600">
                  Created {new Date(session.createdAt).toLocaleString()}
                </div>
                <div className="text-slate-700">
                  Properties evaluated: {session.evaluatedProperties.length}
                </div>
                <div className="text-slate-700">
                  Selected: {session.selectedPropertyIds?.length || 0}
                </div>
                {(session.minPrice || session.maxPrice) && (
                  <div className="text-slate-700">
                    Price range: {session.minPrice ? `$${session.minPrice.toLocaleString()}` : "Any"} -{" "}
                    {session.maxPrice ? `$${session.maxPrice.toLocaleString()}` : "Any"}
                  </div>
                )}
                <div className="text-slate-700">
                  Email sent: {session.finalEmail?.sentAt ? "Yes" : "No"}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a className="btn-secondary" href={`/review/${session.id}`}>View properties</a>
                <a className="btn-secondary" href={`/compose/${session.id}`}>View email</a>
                <button
                  className="btn-secondary border-red-300 text-red-700 hover:border-red-400"
                  onClick={() => setConfirmingSessionId(session.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {confirmingSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Delete search session?</h2>
            <p className="text-sm text-slate-700">
              This will remove the session and its data. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setConfirmingSessionId(null)}>
                No
              </button>
              <button
                className="btn-primary bg-red-600 hover:bg-red-700 border-red-700"
                onClick={handleDeleteSession}
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
