"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { supabase } from "@/lib/supabase";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "";
  const requestedType = searchParams.get("type");
  const tenantInvitationMode = requestedType === "tenant" && next.startsWith("/connect");
  const selectedPlan = searchParams.get("plan");
  const initialPlan = ["free", "pro", "enterprise"].includes(selectedPlan) ? selectedPlan : "free";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    accountType: tenantInvitationMode ? "tenant" : "landlord",
  });
  const [plan] = useState(initialPlan);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenantInvitationMode) {
      setForm((current) => ({ ...current, accountType: "tenant" }));
      if (next) localStorage.setItem("tamlynk_auth_next", next);
    }
  }, [next, tenantInvitationMode]);

  const signInHref = useMemo(() => {
    if (!next) return "/sign-in";
    return `/sign-in?next=${encodeURIComponent(next)}`;
  }, [next]);

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

    if (next) {
      localStorage.setItem("tamlynk_auth_next", next);
      sessionStorage.setItem("tamlynk_auth_next", next);
    }

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (next) callbackUrl.searchParams.set("next", next);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: callbackUrl.toString(),
        data: {
          full_name: form.fullName.trim(),
          account_type: tenantInvitationMode ? "tenant" : form.accountType,
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
      router.push(next || "/dashboard");
      return;
    }

    setMessage(
      tenantInvitationMode
        ? "Tenant account created. Check your email to confirm your address, then you’ll return to connect your unit."
        : "Account created. Check your email to confirm your address, then sign in."
    );
  }

  return (
    <AuthShell
      eyebrow={tenantInvitationMode ? "Tenant invitation" : "Create your account"}
      title={tenantInvitationMode ? "Create your tenant account." : "Start managing with TamLynk."}
      description={
        tenantInvitationMode
          ? "Create your account to connect with your landlord and unit."
          : `You are starting with the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`
      }
      footer={<>Already have an account? <Link href={signInHref}>Sign in</Link></>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>Full name<input name="fullName" value={form.fullName} onChange={updateField} autoComplete="name" required /></label>
        <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required /></label>

        {!tenantInvitationMode && (
          <fieldset className="account-type-fieldset">
            <legend>Account type</legend>
            <div className="account-type-options">
              <label className={form.accountType === "landlord" ? "selected" : ""}>
                <input type="radio" name="accountType" value="landlord" checked={form.accountType === "landlord"} onChange={updateField} />
                <span><strong>Landlord / Manager</strong><small>Manage properties and tenants</small></span>
              </label>
              <label className={form.accountType === "tenant" ? "selected" : ""}>
                <input type="radio" name="accountType" value="tenant" checked={form.accountType === "tenant"} onChange={updateField} />
                <span><strong>Tenant</strong><small>Access your rental account</small></span>
              </label>
            </div>
          </fieldset>
        )}

        <div className="auth-two-column">
          <label>Password<input name="password" type="password" value={form.password} onChange={updateField} autoComplete="new-password" minLength="8" required /></label>
          <label>Confirm password<input name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" minLength="8" required /></label>
        </div>

        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {message && <p className="form-message success-message" role="status">{message}</p>}

        <button className="button full-button auth-submit" type="submit" disabled={loading}>
          {loading ? "Creating account..." : tenantInvitationMode ? "Create Tenant Account" : "Create Account"}
        </button>
        <p className="form-legal">By creating an account, you agree to TamLynk&apos;s Terms and Privacy Policy.</p>
      </form>
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<main className="dashboard-loading"><p>Loading sign up...</p></main>}>
      <SignUpContent />
    </Suspense>
  );
}
