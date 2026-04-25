"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Profile = {
  id: string;
  email: string | null;
  creator_requested: boolean;
  is_creator_approved: boolean;
  updated_at?: string;
};

export default function AdminPage() {
  const [items, setItems] = useState<Profile[]>([]);
  const [error, setError] = useState<string>("");
  const [busyId, setBusyId] = useState<string>("");

  async function load() {
    const res = await apiFetch<{ items: Profile[] }>("/admin/creator-requests");
    setItems(res.items);
  }

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e: unknown) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : "Failed to load.");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function approve(id: string) {
    setBusyId(id);
    setError("");
    try {
      await apiFetch<Profile>(`/admin/creators/${id}/approve`, { method: "POST" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Approve failed.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Admin</h1>
        <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/">
          Home
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-900">Creator approval requests</div>
            <div className="mt-1 text-xs text-zinc-600">
              Only admin emails in the `admins` table can view this.
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-600">No pending requests.</p>
          ) : (
            items.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-zinc-900">{p.email ?? p.id}</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    {p.is_creator_approved ? "Approved" : "Pending"}
                  </div>
                </div>

                {!p.is_creator_approved ? (
                  <button
                    onClick={() => approve(p.id)}
                    disabled={busyId === p.id}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyId === p.id ? "Approving…" : "Approve"}
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

