"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in to TamLynk." description="Access your properties, tenants, leases, and account activity."
      footer={<>New to TamLynk? <Link href="/sign-up">Create an account</Link></>}>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        <label>Password<div className="label-row"><span></span><Link href="/forgot-password">Forgot password?</Link></div><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        <button className="button full-button auth-submit" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
      </form>
    </AuthShell>
  );
}
