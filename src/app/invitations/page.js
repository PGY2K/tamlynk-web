"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { createUnitCode, formatUnitCode } from "@/lib/unitCodes";

export default function InvitationsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [invite, setInvite] = useState(null);
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return router.replace("/sign-in?next=/invitations");
      if (data.user.user_metadata?.account_type === "tenant") return router.replace("/connect");

      const active = (data.user.user_metadata?.properties || []).filter((property) => !property.archived);
      setUser(data.user);
      setProperties(active);

      const requestedUnitId = new URLSearchParams(window.location.search).get("unit");
      if (requestedUnitId) {
        const matchingProperty = active.find((property) =>
          (property.unitRecords || []).some((unit) => unit.id === requestedUnitId),
        );
        if (matchingProperty) {
          setPropertyId(matchingProperty.id);
          setUnitId(requestedUnitId);
        }
      }
      setLoading(false);
    });
  }, [router]);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === propertyId) || null,
    [properties, propertyId],
  );

  const availableUnits = selectedProperty?.unitRecords || [];
  const selectedUnit = availableUnits.find((unit) => unit.id === unitId) || null;

  function clearGeneratedInvitation() {
    setInvite(null);
    setQr("");
    setError("");
  }

  function selectProperty(nextPropertyId) {
    setPropertyId(nextPropertyId);
    setUnitId("");
    clearGeneratedInvitation();
  }

  function selectUnit(nextUnitId) {
    setUnitId(nextUnitId);
    clearGeneratedInvitation();
  }

  async function ensureUnitCode(unit) {
    if (unit.unitCode) return unit.unitCode;

    const code = createUnitCode();
    const nextProperties = properties.map((property) =>
      property.id !== propertyId
        ? property
        : {
            ...property,
            unitRecords: (property.unitRecords || []).map((record) =>
              record.id === unit.id ? { ...record, unitCode: code } : record,
            ),
          },
    );

    const { data, error: updateError } = await supabase.auth.updateUser({
      data: { properties: nextProperties },
    });
    if (updateError) throw updateError;

    setProperties((data.user.user_metadata?.properties || []).filter((property) => !property.archived));
    return code;
  }

  async function generateInvite() {
    if (!selectedProperty) return setError("Select a property first.");
    if (!selectedUnit) return setError("Select a unit first.");

    setSaving(true);
    setError("");

    try {
      const unitCode = await ensureUnitCode(selectedUnit);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const token = crypto.randomUUID().replaceAll("-", "");

      const { data, error: insertError } = await supabase
        .from("unit_invitations")
        .insert({
          token,
          unit_code: unitCode,
          landlord_id: user.id,
          property_id: selectedProperty.id,
          unit_id: selectedUnit.id,
          property_name: selectedProperty.name,
          unit_name: selectedUnit.name,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const url = `${window.location.origin}/connect?code=${encodeURIComponent(unitCode)}`;
      setQr(await QRCode.toDataURL(url, { width: 360, margin: 2 }));
      setInvite({ ...data, url });
    } catch (problem) {
      setError(problem.message || "TamLynk could not create the invitation.");
    } finally {
      setSaving(false);
    }
  }

  async function copyUnitCode() {
    if (!invite?.unit_code) return;
    await navigator.clipboard.writeText(formatUnitCode(invite.unit_code));
  }

  if (loading) {
    return (
      <main className="dashboard-loading">
        <img src="/tamlynk-logo.png" alt="" />
        <p>Loading invitations...</p>
      </main>
    );
  }

  return (
    <main className="properties-shell">
      <header className="properties-topbar">
        <div>
          <Link href="/dashboard" className="back-link">← Dashboard</Link>
          <span className="auth-kicker">Tenant linking</span>
          <h1>Invite a tenant</h1>
          <p>Select a property and one of its units to generate a 24-hour QR invitation.</p>
        </div>
      </header>

      <section className="invite-layout">
        <article className="dashboard-card invite-builder">
          <h2>Generate QR code</h2>

          <label>
            Property
            <select value={propertyId} onChange={(event) => selectProperty(event.target.value)}>
              <option value="">Select property</option>
              {properties.map((property) => (
                <option value={property.id} key={property.id}>{property.name}</option>
              ))}
            </select>
          </label>

          <label>
            Unit
            <select
              value={unitId}
              onChange={(event) => selectUnit(event.target.value)}
              disabled={!selectedProperty}
            >
              <option value="">{selectedProperty ? "Select unit" : "Select property first"}</option>
              {availableUnits.map((unit) => (
                <option value={unit.id} key={unit.id}>{unit.name}</option>
              ))}
            </select>
          </label>

          {selectedProperty && availableUnits.length === 0 && (
            <p className="form-message error-message">This property does not have any units yet.</p>
          )}
          {!properties.length && (
            <p className="form-message error-message">Create a property and at least one unit before inviting a tenant.</p>
          )}
          {error && <p className="form-message error-message">{error}</p>}

          <button
            className="button full-button"
            onClick={generateInvite}
            disabled={!selectedUnit || saving}
          >
            {saving ? "Generating..." : "Generate QR code"}
          </button>
        </article>

        <article className="dashboard-card invite-result">
          {invite ? (
            <>
              <img className="invite-qr" src={qr} alt="Scannable tenant invitation QR code" />
              <div className="unit-code-panel">
                <small>Unit code</small>
                <strong>{formatUnitCode(invite.unit_code)}</strong>
                <button type="button" onClick={copyUnitCode}>Copy unit code</button>
              </div>
            </>
          ) : (
            <div className="invite-placeholder">
              <div>QR</div>
              <strong>No QR code generated</strong>
              <p>Select a property and unit, then generate the code.</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
