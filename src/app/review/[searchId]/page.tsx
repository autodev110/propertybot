"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EvaluatedProperty, SearchSession, Client } from "@/lib/types";
import { PropertyGallery } from "@/components/PropertyGallery";

function formatUSD(value?: number) {
  if (value === undefined) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function ReviewPage() {
  const params = useParams<{ searchId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SearchSession | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/search/${params.searchId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load search");
        setSession(data.session);
        setClient(data.client);
        setSelected(data.session.selectedPropertyIds || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.searchId]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleCreateEmail = async () => {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    try {
      const selectRes = await fetch(`/api/search/${session.id}/selectProperties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedPropertyIds: selected }),
      });
      const selectData = await selectRes.json();
      if (!selectRes.ok) throw new Error(selectData.error || "Failed to save selection");

      const draftRes = await fetch(`/api/search/${session.id}/draftEmail`, {
        method: "POST",
      });
      const draftData = await draftRes.json();
      if (!draftRes.ok) throw new Error(draftData.error || "Failed to draft email");

      router.push(`/compose/${session.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create email");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!session || !client) return <div>Not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Review Properties</h1>
        <div className="text-sm text-slate-700">
          <div className="font-medium">{client.name} ({client.email})</div>
          <div>Preferred location: {session.preferredLocation}</div>
          {(session.minPrice || session.maxPrice) && (
            <div>
              Price range: {session.minPrice ? formatUSD(session.minPrice) : "Any"} -{" "}
              {session.maxPrice ? formatUSD(session.maxPrice) : "Any"}
            </div>
          )}
          <div className="text-slate-600">Notes: {session.clientNotes}</div>
        </div>
      </div>

      <div className="grid gap-4">
        {session.evaluatedProperties.map((property: EvaluatedProperty) => (
          <div key={property.id} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{property.address}</div>
                <div className="text-sm text-slate-600">
                  {property.city}, {property.state} {property.zipcode}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold">{formatUSD(property.price)}</div>
                <div className="text-sm text-slate-600">
                  {property.beds} bd • {property.baths} ba • {property.sqft ? `${property.sqft.toLocaleString()} sqft` : "N/A"}
                </div>
                <div className="text-sm text-slate-500">
                  {property.daysOnMarket ? `${property.daysOnMarket} days` : "Days on market N/A"}
                </div>
                <a className="text-sm" href={property.zillowUrl} target="_blank" rel="noreferrer">
                  View on Zillow
                </a>
              </div>
            </div>

            <PropertyGallery photos={property.photos} />

            {property.description && (
              <div className="text-sm text-slate-700">
                {property.description.length > 240
                  ? `${property.description.slice(0, 240)}...`
                  : property.description}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="text-sm">
                <div className="font-semibold text-slate-800">Score</div>
                <div className="text-blue-700 font-semibold">{property.aiScore}/100</div>
              </div>
              <div className="text-sm">
                <div className="font-semibold text-slate-800">Pros</div>
                <ul className="list-disc pl-5 text-slate-700">
                  {property.aiPros.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="text-sm">
                <div className="font-semibold text-slate-800">Cons</div>
                <ul className="list-disc pl-5 text-slate-700">
                  {property.aiCons.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-sm text-slate-700">
              <div className="font-semibold text-slate-800">Rationale</div>
              <p>{property.aiRationale}</p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={selected.includes(property.id)}
                onChange={() => toggleSelect(property.id)}
                className="h-4 w-4"
              />
              Select for client email
            </label>
          </div>
        ))}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end">
        <button
          className="btn-primary"
          disabled={selected.length === 0 || submitting}
          onClick={handleCreateEmail}
        >
          {submitting ? "Creating email..." : "Create Client Email"}
        </button>
      </div>
    </div>
  );
}
