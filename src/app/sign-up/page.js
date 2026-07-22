"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "", accountType: "landlord" });
  const [plan, setPlan] = useState("free");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const selectedPlan = new URLSearchParams(window.location.search).get("plan");
    if (["free", "pro", "enterprise"].includes(selectedPlan)) setPlan(selectedPlan);
  }, []);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: form.fullName.trim(),
          account_type: form.accountType,
          plan,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      return;
    }

    setMessage("Account created. Check your email to confirm your address, then sign in.");
  }

  return (
    <AuthShell
      eyebrow="Create your account"
      title="Start managing with TamLynk."
      description={`You are starting with the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`}
      footer={<>Already have an account? <Link href="/sign-in">Sign in</Link></>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>Full name<input name="fullName" value={form.fullName} onChange={updateField} autoComplete="name" required /></label>
        <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required /></label>
        <fieldset className="account-type-fieldset">
          <legend>Account type</legend>
          <div className="account-type-options">
            <label className={form.accountType === "landlord" ? "selected" : ""}><input type="radio" name="accountType" value="landlord" checked={form.accountType === "landlord"} onChange={updateField} /><span><strong>Landlord / Manager</strong><small>Manage properties and tenants</small></span></label>
            <label className={form.accountType === "tenant" ? "selected" : ""}><input type="radio" name="accountType" value="tenant" checked={form.accountType === "tenant"} onChange={updateField} /><span><strong>Tenant</strong><small>Access your rental account</small></span></label>
          </div>
        </fieldset>
        <div className="auth-two-column">
          <label>Password<input name="password" type="password" value={form.password} onChange={updateField} autoComplete="new-password" minLength="8" required /></label>
          <label>Confirm password<input name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" minLength="8" required /></label>
        </div>
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {message && <p className="form-message success-message" role="status">{message}</p>}
        <button className="button full-button auth-submit" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create Account"}</button>
        <p className="form-legal">By creating an account, you agree to TamLynk&apos;s Terms and Privacy Policy.</p>
      </form>
    </AuthShell>
  );
}
