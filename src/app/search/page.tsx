"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    preferredLocation: "",
    clientNotes: "",
    minPrice: "",
    maxPrice: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        minPrice: form.minPrice ? Number(form.minPrice) : undefined,
        maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
      };
      const res = await fetch("/api/search/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create search");
      router.push(`/review/${data.searchId}`);
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New Property Search</h1>
        <p className="text-sm text-slate-600">Enter client details to start a search.</p>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm gap-1">
            <span className="text-slate-700 font-medium">Client name</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              name="clientName"
              value={form.clientName}
              onChange={handleChange}
              required
            />
          </label>
          <label className="flex flex-col text-sm gap-1">
            <span className="text-slate-700 font-medium">Client email</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              type="email"
              name="clientEmail"
              value={form.clientEmail}
              onChange={handleChange}
              required
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm gap-1">
            <span className="text-slate-700 font-medium">Min price</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              type="number"
              name="minPrice"
              value={form.minPrice}
              onChange={handleChange}
              placeholder="e.g. 250000"
              min={0}
            />
          </label>
          <label className="flex flex-col text-sm gap-1">
            <span className="text-slate-700 font-medium">Max price</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              type="number"
              name="maxPrice"
              value={form.maxPrice}
              onChange={handleChange}
              placeholder="e.g. 600000"
              min={0}
            />
          </label>
        </div>
        <label className="flex flex-col text-sm gap-1">
          <span className="text-slate-700 font-medium">Preferred location</span>
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            name="preferredLocation"
            value={form.preferredLocation}
            onChange={handleChange}
            placeholder="City, county, or ZIP"
            required
          />
        </label>
        <label className="flex flex-col text-sm gap-1">
          <span className="text-slate-700 font-medium">Client notes</span>
          <textarea
            className="min-h-[120px] rounded-md border border-slate-300 px-3 py-2"
            name="clientNotes"
            value={form.clientNotes}
            onChange={handleChange}
            placeholder="Budget, beds/baths, must-haves, timeline..."
            required
          />
        </label>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end">
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search Properties"}
          </button>
        </div>
      </form>
    </div>
  );
}
