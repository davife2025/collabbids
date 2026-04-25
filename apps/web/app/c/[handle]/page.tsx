"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type PublicProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  is_creator_approved: boolean;
};

type Auction = {
  id: string;
  title: string;
  starting_bid_cents: number;
  ends_at: string;
  is_creator_approved_at_creation: boolean;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}

export default function CreatorStorefrontPage({
  params,
}: {
  params: { handle: string };
}) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState("");
  const [auctions, setAuctions] = useState<Auction[]>([]);

  useEffect(() => {
    apiFetch<PublicProfile>(`/creators/${encodeURIComponent(params.handle)}`)
      .then(setProfile)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Not found."));
  }, [params.handle]);

  useEffect(() => {
    apiFetch<{ items: Auction[] }>(`/auctions?creator=${encodeURIComponent(params.handle)}`)
      .then((r) => setAuctions(r.items))
      .catch(() => {});
  }, [params.handle]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/">
          ← Home
        </Link>
        <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/auctions">
          Explore
        </Link>
      </div>

      {error ? (
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Creator not found</h1>
          <p className="mt-2 text-sm text-zinc-600">{error}</p>
        </div>
      ) : !profile ? (
        <p className="mt-10 text-sm text-zinc-600">Loading…</p>
      ) : (
        <div className="mt-10">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                  {profile.display_name ?? profile.handle ?? "Creator"}
                </h1>
                <p className="mt-2 text-sm text-zinc-600">
                  Storefront: <span className="font-medium">/c/{profile.handle}</span>
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  profile.is_creator_approved
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {profile.is_creator_approved ? "Verified creator" : "Unverified creator"}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8">
            <h2 className="text-lg font-semibold text-zinc-900">Listings</h2>
            {auctions.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600">No active auctions yet.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {auctions.map((a) => (
                  <Link
                    key={a.id}
                    href={`/auctions/${a.id}`}
                    className="rounded-2xl border border-zinc-200 bg-white p-5 hover:border-zinc-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-600">Auction</span>
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
                      <span className="text-zinc-600">Starts {formatMoney(a.starting_bid_cents)}</span>
                      <span className="text-zinc-600">Ends {new Date(a.ends_at).toLocaleString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

