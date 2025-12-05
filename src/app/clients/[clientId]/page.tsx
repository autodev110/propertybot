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

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/clients/${params.clientId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load client");
        setClient(data.client);
        setSessions(data.sessions || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load client");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.clientId]);

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{client.name}</h1>
          <div className="text-sm text-slate-700">{client.email}</div>
          <div className="text-xs text-slate-500">
            Joined {new Date(client.createdAt).toLocaleString()}
          </div>
        </div>
        <a className="btn-secondary" href="/clients">Back to clients</a>
      </div>

      <div className="card space-y-3">
          <div className="text-sm font-semibold text-slate-800">Search sessions</div>
          {sessions.length === 0 && <div className="text-sm text-slate-600">No searches yet.</div>}
          <div className="grid gap-3">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-md border border-slate-200 p-3">
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
              <div className="mt-2 flex gap-2">
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

      {actionMessage && <div className="text-sm text-slate-700">{actionMessage}</div>}

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
