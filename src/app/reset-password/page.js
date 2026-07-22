"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Your password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("The passwords do not match.");
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) setError(updateError.message);
    else router.push("/dashboard");
  }

  return (
    <AuthShell eyebrow="Secure your account" title="Choose a new password." description="Use at least 8 characters for your new TamLynk password.">
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength="8" required /></label>
        <label>Confirm new password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength="8" required /></label>
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        <button className="button full-button auth-submit" type="submit" disabled={loading}>{loading ? "Updating password..." : "Update Password"}</button>
      </form>
    </AuthShell>
  );
}
