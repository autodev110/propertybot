"use client";

import { useEffect, useState } from "react";
import { Client } from "@/lib/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClientId, setConfirmingClientId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/clients");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load clients");
        setClients(data.clients || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load clients");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  const handleDelete = async () => {
    if (!confirmingClientId) return;
    setActionMessage(null);
    try {
      const res = await fetch(`/api/clients/${confirmingClientId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete client");
      setClients((prev) => prev.filter((c) => c.id !== confirmingClientId));
      setActionMessage("Client deleted.");
    } catch (err: any) {
      setActionMessage(err?.message || "Failed to delete client");
    } finally {
      setConfirmingClientId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-600">History of searches and emails.</p>
        </div>
        <a className="btn-secondary" href="/search">New Search</a>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Searches</th>
              <th className="px-4 py-3">Last email sent</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {clients.map((client) => {
              const lastSent = client.searches.find((s) => s.hasEmailSent);
              return (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{client.name}</td>
                  <td className="px-4 py-3 text-slate-700">{client.email}</td>
                  <td className="px-4 py-3 text-slate-700">{client.searches.length}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {lastSent ? new Date(lastSent.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <a className="btn-secondary" href={`/clients/${client.id}`}>View</a>
                    <button
                      className="btn-secondary border-red-300 text-red-700 hover:border-red-400"
                      onClick={() => setConfirmingClientId(client.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {actionMessage && <div className="text-sm text-slate-700">{actionMessage}</div>}

      {confirmingClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Delete client?</h2>
            <p className="text-sm text-slate-700">
              This will delete the client and all associated search sessions. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setConfirmingClientId(null)}
              >
                No
              </button>
              <button
                className="btn-primary bg-red-600 hover:bg-red-700 border-red-700"
                onClick={handleDelete}
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
