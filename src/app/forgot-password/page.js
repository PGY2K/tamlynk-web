"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) setError(resetError.message);
    else setMessage("Check your email for a secure password reset link.");
  }

  return (
    <AuthShell eyebrow="Account recovery" title="Reset your password." description="Enter the email address connected to your TamLynk account."
      footer={<Link href="/sign-in">← Back to sign in</Link>}>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {message && <p className="form-message success-message" role="status">{message}</p>}
        <button className="button full-button auth-submit" type="submit" disabled={loading}>{loading ? "Sending link..." : "Send Reset Link"}</button>
      </form>
    </AuthShell>
  );
}
