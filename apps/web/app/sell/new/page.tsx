"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Profile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  is_creator_approved: boolean;
};

export default function NewAuctionPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bullets, setBullets] = useState<string>("Signed print\nShips in 3-5 days\nLimited drop");
  const [startingBid, setStartingBid] = useState("10");
  const [reserve, setReserve] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    apiFetch<Profile>("/profile")
      .then(setProfile)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Please sign in."));
  }, []);

  async function onCreate() {
    setBusy(true);
    setError("");
    try {
      const ends = endsAt ? new Date(endsAt).toISOString() : "";
      const starting_bid_cents = Math.round(Number(startingBid) * 100);
      const reserve_price_cents = reserve ? Math.round(Number(reserve) * 100) : null;

      const created = await apiFetch<{ id: string }>("/auctions", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || null,
          category: "prints",
          starting_bid_cents,
          reserve_price_cents,
          ends_at: ends,
        }),
      });

      window.location.href = `/auctions/${created.id}`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  async function generateDescription() {
    setAiBusy(true);
    setError("");
    try {
      const bulletList = bullets
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8);

      const res = await apiFetch<{ description: string }>("/ai/auction-description", {
        method: "POST",
        body: JSON.stringify({ title, bullets: bulletList, tone: "minimal" }),
      });
      setDescription(res.description);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "AI failed.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">List a craft</h1>
        <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/auctions">
          Explore
        </Link>
      </div>

      {profile && !profile.is_creator_approved ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          You are currently <span className="font-medium">unverified</span>. Your auction will be
          visible, but marked as <span className="font-medium">High risk / unverified</span>.
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              placeholder="e.g. Signed A3 print (limited drop)"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 min-h-28 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              placeholder="Add details about the print/craft, shipping timeline, what's included…"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-zinc-600">AI bullets (for description)</span>
            <textarea
              value={bullets}
              onChange={(e) => setBullets(e.target.value)}
              className="mt-2 min-h-24 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              placeholder={"Signed print\nShips in 3-5 days\nLimited drop"}
            />
            <button
              type="button"
              onClick={generateDescription}
              disabled={aiBusy || !title}
              className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiBusy ? "Generating…" : "Generate description with AI (Kimi K2.5)"}
            </button>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-zinc-600">Starting bid (USD)</span>
              <input
                value={startingBid}
                onChange={(e) => setStartingBid(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                placeholder="10"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-600">Reserve price (optional)</span>
              <input
                value={reserve}
                onChange={(e) => setReserve(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                placeholder="e.g. 50"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Auction end time</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Tip: choose a time at least 10 minutes in the future.
            </p>
          </label>

          <button
            onClick={onCreate}
            disabled={busy || !title || !endsAt}
            className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create auction"}
          </button>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

