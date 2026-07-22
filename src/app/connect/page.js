"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatUnitCode, normalizeUnitCode } from "@/lib/unitCodes";

function ConnectFlow() {
  const search = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [code, setCode] = useState(search.get("code") || "");
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user || null); setStatus("ready"); });
  }, []);

  async function lookUp() {
    setError("");
    const normalized = normalizeUnitCode(code);
    if (normalized.length !== 8) return setError("Enter the complete 8-character unit code.");
    const { data, error: lookupError } = await supabase.rpc("preview_unit_invitation", { submitted_code: normalized });
    if (lookupError || !data?.length) return setError(lookupError?.message || "This code is invalid or expired.");
    setPreview(data[0]);
  }

  useEffect(() => { if (status === "ready" && normalizeUnitCode(code).length === 8) lookUp(); }, [status]);

  async function accept() {
    if (!user) {
      const next = `/connect?code=${encodeURIComponent(normalizeUnitCode(code))}`;
      router.push(`/sign-in?next=${encodeURIComponent(next)}`);
      return;
    }
    if (user.user_metadata?.account_type !== "tenant") return setError("Only tenant accounts can accept a unit invitation.");
    setStatus("saving");
    const { data, error: acceptError } = await supabase.rpc("accept_unit_invitation", { submitted_code: normalizeUnitCode(code) });
    if (acceptError) { setError(acceptError.message); setStatus("ready"); return; }
    await supabase.auth.updateUser({ data: { tenant_assignment: data } });
    setStatus("connected");
  }

  if (status === "loading") return <main className="dashboard-loading"><p>Loading invitation...</p></main>;
  return <main className="connect-shell"><section className="connect-card"><Link href="/" className="connect-logo"><img src="/tamlynk-logo.png" alt="" /><strong>TamLynk</strong></Link>{status === "connected" ? <div className="connect-success"><span>✓</span><h1>You’re connected.</h1><p>Your landlord, property, and unit are now linked to your tenant account.</p><Link className="button full-button" href="/dashboard">Open tenant dashboard</Link></div> : <><span className="auth-kicker">Tenant invitation</span><h1>Connect to your unit</h1><p>Scan the landlord’s QR code or enter the unit code below.</p><label>Unit code<input value={formatUnitCode(code)} onChange={(event) => { setCode(event.target.value); setPreview(null); }} placeholder="ABCD-1234" maxLength={9} /></label><button className="button button-secondary full-button" onClick={lookUp}>Find unit</button>{error && <p className="form-message error-message">{error}</p>}{preview && <div className="connect-preview"><small>You are connecting to</small><strong>{preview.unit_name}</strong><span>{preview.property_name}</span><p>This invitation expires {new Date(preview.expires_at).toLocaleString()}.</p><button className="button full-button" onClick={accept} disabled={status === "saving"}>{status === "saving" ? "Connecting..." : user ? "Connect my tenant account" : "Sign in to connect"}</button>{!user && <small>New tenant? <Link href={`/sign-up?type=tenant&next=${encodeURIComponent(`/connect?code=${normalizeUnitCode(code)}`)}`}>Create an account</Link></small>}</div>}</>}</section></main>;
}

export default function ConnectPage() { return <Suspense fallback={<main className="dashboard-loading"><p>Loading invitation...</p></main>}><ConnectFlow /></Suspense>; }
