"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function finishAuthentication() {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (data.session) {
        const queryNext = searchParams.get("next");
        const storedNext = localStorage.getItem("tamlynk_auth_next") || sessionStorage.getItem("tamlynk_auth_next");
        const next = queryNext || storedNext || "/dashboard";

        localStorage.removeItem("tamlynk_auth_next");
        sessionStorage.removeItem("tamlynk_auth_next");
        router.replace(next);
        return;
      }

      setError("The confirmation link is invalid or has expired.");
    }

    finishAuthentication();
    return () => { active = false; };
  }, [router, searchParams]);

  return (
    <main className="auth-status-page">
      <img src="/tamlynk-logo.png" alt="" />
      <h1>{error ? "We could not confirm your account." : "Confirming your TamLynk account..."}</h1>
      <p>{error || "You will be redirected automatically."}</p>
      {error && <Link className="button" href="/sign-in">Return to Sign In</Link>}
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="auth-status-page"><p>Confirming your TamLynk account...</p></main>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
