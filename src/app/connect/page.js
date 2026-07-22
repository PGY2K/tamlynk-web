"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatUnitCode, normalizeUnitCode } from "@/lib/unitCodes";

const PENDING_CODE_KEY = "tamlynk_pending_unit_code";

function ConnectFlow() {
  const search = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [code, setCode] = useState(search.get("code") || "");
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const queryCode = normalizeUnitCode(search.get("code") || "");
    const savedCode = normalizeUnitCode(localStorage.getItem(PENDING_CODE_KEY) || "");
    const startingCode = queryCode || savedCode;

    if (startingCode) {
      setCode(startingCode);
      localStorage.setItem(PENDING_CODE_KEY, startingCode);
    }

    supabase.auth.getUser().then(({ data, error: userError }) => {
      if (userError) setError(userError.message);
      setUser(data?.user || null);
      setStatus("ready");
    });
  }, [search]);

  async function lookUp(codeToFind = code) {
    setError("");
    const normalized = normalizeUnitCode(codeToFind);

    if (normalized.length !== 8) {
      setPreview(null);
      setError("Enter the complete 8-character unit code.");
      return;
    }

    localStorage.setItem(PENDING_CODE_KEY, normalized);
    const { data, error: lookupError } = await supabase.rpc("preview_unit_invitation", {
      submitted_code: normalized,
    });

    if (lookupError || !data?.length) {
      setPreview(null);
      setError(lookupError?.message || "This code is invalid or expired.");
      return;
    }

    setPreview(data[0]);
  }

  useEffect(() => {
    if (status === "ready" && normalizeUnitCode(code).length === 8 && !preview) {
      lookUp(code);
    }
    // This should run once after authentication and the starting code are ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function accept() {
    setError("");
    const normalized = normalizeUnitCode(code);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const currentUser = userData?.user || null;

    if (userError) {
      setError(userError.message);
      return;
    }

    if (!currentUser) {
      const next = `/connect?code=${encodeURIComponent(normalized)}`;
      localStorage.setItem(PENDING_CODE_KEY, normalized);
      router.push(`/sign-in?next=${encodeURIComponent(next)}`);
      return;
    }

    if (currentUser.user_metadata?.account_type !== "tenant") {
      setError("This invitation must be connected using a tenant account.");
      return;
    }

    setUser(currentUser);
    setStatus("saving");

    const { data, error: acceptError } = await supabase.rpc("accept_unit_invitation", {
      submitted_code: normalized,
    });

    if (acceptError) {
      setError(acceptError.message);
      setStatus("ready");
      return;
    }

    const { error: metadataError } = await supabase.auth.updateUser({
      data: { tenant_assignment: data },
    });

    if (metadataError) {
      setError(`Your unit was connected, but your account could not refresh: ${metadataError.message}`);
      setStatus("connected");
      localStorage.removeItem(PENDING_CODE_KEY);
      return;
    }

    localStorage.removeItem(PENDING_CODE_KEY);
    setStatus("connected");
  }

  if (status === "loading") {
    return <main className="dashboard-loading"><p>Loading invitation...</p></main>;
  }

  const normalizedCode = normalizeUnitCode(code);
  const nextPath = `/connect?code=${normalizedCode}`;

  return (
    <main className="connect-shell">
      <section className="connect-card">
        <Link href="/" className="connect-logo"><img src="/tamlynk-logo.png" alt="" /><strong>TamLynk</strong></Link>

        {status === "connected" ? (
          <div className="connect-success">
            <span>✓</span>
            <h1>You’re connected.</h1>
            <p>Your landlord, property, and unit are now linked to your tenant account.</p>
            <Link className="button full-button" href="/dashboard">Open tenant dashboard</Link>
          </div>
        ) : (
          <>
            <span className="auth-kicker">Tenant invitation</span>
            <h1>Connect to your unit</h1>
            <p>Scan the landlord’s QR code or enter the unit code below.</p>

            <label>
              Unit code
              <input
                value={formatUnitCode(code)}
                onChange={(event) => {
                  const nextCode = event.target.value;
                  setCode(nextCode);
                  setPreview(null);
                  setError("");
                  const normalized = normalizeUnitCode(nextCode);
                  if (normalized) localStorage.setItem(PENDING_CODE_KEY, normalized);
                }}
                placeholder="ABCD-1234"
                maxLength={9}
              />
            </label>

            <button className="button button-secondary full-button" type="button" onClick={() => lookUp()}>
              Find unit
            </button>

            {error && <p className="form-message error-message" role="alert">{error}</p>}

            {preview && (
              <div className="connect-preview">
                <small>You are connecting to</small>
                <strong>{preview.unit_name}</strong>
                <span>{preview.property_name}</span>
                <p>This invitation expires {new Date(preview.expires_at).toLocaleString()}.</p>

                <button className="button full-button" type="button" onClick={accept} disabled={status === "saving"}>
                  {status === "saving" ? "Connecting..." : user ? "Connect my tenant account" : "Sign in to connect"}
                </button>

                {!user && (
                  <small>
                    New tenant?{" "}
                    <Link href={`/sign-up?type=tenant&next=${encodeURIComponent(nextPath)}`}>
                      Create a tenant account
                    </Link>
                  </small>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<main className="dashboard-loading"><p>Loading invitation...</p></main>}>
      <ConnectFlow />
    </Suspense>
  );
}
