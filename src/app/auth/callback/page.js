"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function finishAuthentication() {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      else if (data.session) router.replace("/dashboard");
      else setError("The confirmation link is invalid or has expired.");
    }
    finishAuthentication();
    return () => { active = false; };
  }, [router]);

  return (
    <main className="auth-status-page">
      <img src="/tamlynk-logo.png" alt="" />
      <h1>{error ? "We could not confirm your account." : "Confirming your TamLynk account..."}</h1>
      <p>{error || "You will be redirected automatically."}</p>
      {error && <Link className="button" href="/sign-in">Return to Sign In</Link>}
    </main>
  );
}
