"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

function AuthCallbackInner() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [message, setMessage] = useState(
    code ? "Signing you in…" : "Missing code. Try signing in again."
  );

  useEffect(() => {
    if (!code) return;
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) { setMessage(error.message); return; }
        router.replace("/");
      })
      .catch((e: unknown) => {
        setMessage(e instanceof Error ? e.message : "Sign-in failed.");
      });
  }, [code, router, supabase]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-xl font-semibold tracking-tight">Auth</h1>
      <p className="mt-2 text-sm text-zinc-700">{message}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <p className="mt-2 text-sm text-zinc-700">Signing you in…</p>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}