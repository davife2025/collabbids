"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Auction = {
  id: string;
  title: string;
  category: string;
  starting_bid_cents: number;
  reserve_price_cents: number | null;
  ends_at: string;
  is_creator_approved_at_creation: boolean;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}

export default function AuctionsPage() {
  const [items, setItems] = useState<Auction[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ items: Auction[] }>("/auctions")
      .then((r) => setItems(r.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load."));
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Explore auctions</h1>
        <div className="flex items-center gap-2">
          <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/">
            Home
          </Link>
          <Link className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800" href="/sell/new">
            List a craft
          </Link>
        </div>
      </div>

      {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <Link
            key={a.id}
            href={`/auctions/${a.id}`}
            className="rounded-2xl border border-zinc-200 bg-white p-5 hover:border-zinc-300"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-600">{a.category}</span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  a.is_creator_approved_at_creation
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {a.is_creator_approved_at_creation ? "Verified" : "Unverified"}
              </span>
            </div>
            <div className="mt-2 text-base font-semibold text-zinc-900">{a.title}</div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-zinc-600">
                Starts {formatMoney(a.starting_bid_cents)}
              </span>
              <span className="text-zinc-600">
                Ends {new Date(a.ends_at).toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-600">
            No auctions yet. Create one from <span className="font-medium">List a craft</span>.
          </div>
        ) : null}
      </div>
    </div>
  );
}

