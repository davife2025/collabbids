"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Auction = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: string;
  starting_bid_cents: number;
  reserve_price_cents: number | null;
  ends_at: string;
  status: string;
  is_creator_approved_at_creation: boolean;
  created_at: string;
};

type Bid = {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount_cents: number;
  created_at: string;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}

export default function AuctionDetailPage({ params }: { params: { id: string } }) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [error, setError] = useState("");
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidUsd, setBidUsd] = useState("");
  const [placing, setPlacing] = useState(false);
  const [walletCents, setWalletCents] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<Auction>(`/auctions/${encodeURIComponent(params.id)}`)
      .then(setAuction)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Not found."));
  }, [params.id]);

  useEffect(() => {
    apiFetch<{ items: Bid[] }>(`/auctions/${encodeURIComponent(params.id)}/bids`)
      .then((r) => setBids(r.items))
      .catch(() => {});
  }, [params.id]);

  useEffect(() => {
    apiFetch<{ balance_cents: number }>(`/wallet`)
      .then((r) => setWalletCents(r.balance_cents ?? 0))
      .catch(() => setWalletCents(null));
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`bids:${params.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bids", filter: `auction_id=eq.${params.id}` },
        (payload) => {
          const bid = payload.new as Bid;
          setBids((prev) => [bid, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  const highest = bids[0]?.amount_cents ?? null;
  const minNextCents = highest != null ? highest + 1 : (auction?.starting_bid_cents ?? 0) + 1;

  async function demoTopUp10() {
    const wallet = await apiFetch<{ balance_cents: number }>(`/wallet/demo-topup`, {
      method: "POST",
      body: JSON.stringify({ amount_cents: 1000 }),
    });
    setWalletCents(wallet.balance_cents);
  }

  async function placeBidNow() {
    setPlacing(true);
    setError("");
    try {
      const amount = Math.round(Number(bidUsd) * 100);
      const bid = await apiFetch<Bid>(`/auctions/${encodeURIComponent(params.id)}/bids`, {
        method: "POST",
        body: JSON.stringify({ amount_cents: amount }),
      });
      setBids((prev) => [bid, ...prev]);
      setBidUsd("");
      // refresh wallet
      const w = await apiFetch<{ balance_cents: number }>(`/wallet`);
      setWalletCents(w.balance_cents ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bid failed.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/auctions">
          ← Back to explore
        </Link>
        <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/">
          Home
        </Link>
      </div>

      {error ? (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Auction not found</h1>
          <p className="mt-2 text-sm text-zinc-600">{error}</p>
        </div>
      ) : !auction ? (
        <p className="mt-8 text-sm text-zinc-600">Loading…</p>
      ) : (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-medium text-zinc-600">{auction.category}</div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                auction.is_creator_approved_at_creation
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {auction.is_creator_approved_at_creation ? "Verified creator" : "High risk / unverified"}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
            {auction.title}
          </h1>
          {auction.description ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {auction.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No description yet.</p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-medium text-zinc-600">Starting bid</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">
                {formatMoney(auction.starting_bid_cents)}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-medium text-zinc-600">Reserve</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">
                {auction.reserve_price_cents != null ? formatMoney(auction.reserve_price_cents) : "None"}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-medium text-zinc-600">Ends at</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">
                {new Date(auction.ends_at).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-900">Place a bid</div>
                <div className="text-xs text-zinc-600">
                  Wallet:{" "}
                  {walletCents == null ? "Sign in" : formatMoney(walletCents)}
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                Minimum next bid: <span className="font-medium">{formatMoney(minNextCents)}</span>
              </p>

              <div className="mt-4 flex gap-2">
                <input
                  value={bidUsd}
                  onChange={(e) => setBidUsd(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  placeholder="Amount (USD), e.g. 25"
                />
                <button
                  onClick={placeBidNow}
                  disabled={placing || !bidUsd}
                  className="shrink-0 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {placing ? "…" : "Bid"}
                </button>
              </div>

              <button
                onClick={demoTopUp10}
                className="mt-3 text-xs font-medium text-zinc-700 hover:text-zinc-900"
              >
                + Add $10 demo funds
              </button>

              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>

            <div className="rounded-2xl border border-zinc-200 p-5">
              <div className="text-sm font-medium text-zinc-900">Live bids</div>
              <p className="mt-2 text-xs text-zinc-600">
                Updates in real-time when new bids come in.
              </p>

              <div className="mt-4 space-y-2">
                {bids.length === 0 ? (
                  <p className="text-sm text-zinc-600">No bids yet.</p>
                ) : (
                  bids.slice(0, 10).map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-700">{formatMoney(b.amount_cents)}</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(b.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

