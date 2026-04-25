"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  handle?: string | null;
  creator_requested: boolean;
  is_creator_approved: boolean;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    apiFetch<Profile>("/profile")
      .then((p) => {
        setProfile(p);
        setHandle(p.handle ?? "");
        setDisplayName(p.display_name ?? "");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load."));
  }, []);

  async function saveProfile() {
    setBusy(true);
    setError("");
    try {
      const updated = await apiFetch<Profile>("/profile", {
        method: "PATCH",
        body: JSON.stringify({
          handle: handle ? handle.toLowerCase() : null,
          display_name: displayName ? displayName : null,
        }),
      });
      setProfile(updated);
      setHandle(updated.handle ?? "");
      setDisplayName(updated.display_name ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function requestCreator() {
    setBusy(true);
    setError("");
    try {
      const updated = await apiFetch<Profile>("/profile/request-creator", { method: "POST" });
      setProfile(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Profile</h1>
        <Link className="text-sm text-zinc-600 hover:text-zinc-900" href="/">
          Home
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
        {!profile ? (
          <p className="text-sm text-zinc-600">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-zinc-600">Email</div>
              <div className="mt-1 text-sm text-zinc-900">{profile.email ?? "—"}</div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-zinc-600">Display name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  placeholder="e.g. Sunny Prints"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-zinc-600">Storefront handle</span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9_]/gi, ""))}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  placeholder="e.g. sunnyprints"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Your public URL will be <span className="font-medium">/c/{handle || "yourhandle"}</span>
                </p>
              </label>
            </div>

            <button
              onClick={saveProfile}
              disabled={busy}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save profile"}
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  profile.is_creator_approved
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {profile.is_creator_approved ? "Verified creator" : "Unverified creator"}
              </span>

              {profile.creator_requested && !profile.is_creator_approved ? (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                  Approval requested
                </span>
              ) : null}
            </div>

            {!profile.creator_requested && !profile.is_creator_approved ? (
              <button
                onClick={requestCreator}
                disabled={busy}
                className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Requesting…" : "Request creator approval"}
              </button>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

