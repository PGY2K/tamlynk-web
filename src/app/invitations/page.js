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
      setUser(data.user);
      const active=(data.user.user_metadata?.properties || []).filter((property) => !property.archived);
      setProperties(active);
      const requested=new URLSearchParams(window.location.search).get("unit");
      if(requested) setUnitId(requested);
      setLoading(false);
    });
  }, [router]);

  const units = useMemo(() => properties.flatMap((property) => (property.unitRecords || []).map((unit) => ({ ...unit, property }))), [properties]);
  const selected = units.find((unit) => unit.id === unitId);

  async function ensureUnitCode(unit) {
    if (unit.unitCode) return unit.unitCode;
    const code = createUnitCode();
    const next = properties.map((property) => property.id !== unit.propertyId ? property : ({
      ...property,
      unitRecords: (property.unitRecords || []).map((record) => record.id === unit.id ? { ...record, unitCode: code } : record),
    }));
    const { data, error: updateError } = await supabase.auth.updateUser({ data: { properties: next } });
    if (updateError) throw updateError;
    setProperties((data.user.user_metadata?.properties || []).filter((property) => !property.archived));
    return code;
  }

  async function generateInvite() {
    if (!selected) return setError("Select a unit first.");
    setSaving(true);
    setError("");
    try {
      const unitCode = await ensureUnitCode(selected);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const token = crypto.randomUUID().replaceAll("-", "");
      const { data, error: insertError } = await supabase.from("unit_invitations").insert({
        token,
        unit_code: unitCode,
        landlord_id: user.id,
        property_id: selected.property.id,
        unit_id: selected.id,
        property_name: selected.property.name,
        unit_name: selected.name,
        expires_at: expiresAt,
      }).select().single();
      if (insertError) throw insertError;
      const url = `${window.location.origin}/connect?code=${encodeURIComponent(unitCode)}&token=${token}`;
      setQr(await QRCode.toDataURL(url, { width: 360, margin: 2 }));
      setInvite({ ...data, url });
    } catch (problem) {
      setError(problem.message || "TamLynk could not create the invitation.");
    } finally {
      setSaving(false);
    }
  }

  async function copy(value) {
    await navigator.clipboard.writeText(value);
  }

  if (loading) return <main className="dashboard-loading"><img src="/tamlynk-logo.png" alt="" /><p>Loading invitations...</p></main>;

  return <main className="properties-shell">
    <header className="properties-topbar"><div><Link href="/dashboard" className="back-link">← Dashboard</Link><span className="auth-kicker">Tenant linking</span><h1>Invite a tenant</h1><p>Every invitation connects to one specific unit and expires after 24 hours.</p></div></header>
    <section className="invite-layout">
      <article className="dashboard-card invite-builder">
        <span className="invite-step">1</span><h2>Choose the unit</h2><p>The property is inherited from the selected unit. A unit must belong to a property.</p>
        <label>Unit<select value={unitId} onChange={(event) => { setUnitId(event.target.value); setInvite(null); setQr(""); }}><option value="">Select a unit</option>{properties.map((property) => <optgroup label={property.name} key={property.id}>{(property.unitRecords || []).map((unit) => <option value={unit.id} key={unit.id}>{unit.name}</option>)}</optgroup>)}</select></label>
        {selected && <div className="selected-unit"><strong>{selected.name}</strong><span>{selected.property.name}</span><small>{selected.property.address}, {selected.property.city}, {selected.property.state}</small></div>}
        {!units.length && <p className="form-message error-message">Create a property and at least one unit before inviting a tenant.</p>}
        {error && <p className="form-message error-message">{error}</p>}
        <button className="button full-button" onClick={generateInvite} disabled={!selected || saving}>{saving ? "Generating..." : "Generate 24-hour invitation"}</button>
      </article>
      <article className="dashboard-card invite-result">
        <span className="invite-step">2</span><h2>Share the invitation</h2>
        {invite ? <><img className="invite-qr" src={qr} alt="Scannable tenant invitation QR code" /><div className="unit-code-panel"><small>Backup unit code</small><strong>{formatUnitCode(invite.unit_code)}</strong><button onClick={() => copy(formatUnitCode(invite.unit_code))}>Copy code</button></div><p className="invite-expiry">Expires {new Date(invite.expires_at).toLocaleString()}</p><button className="button button-secondary full-button" onClick={() => copy(invite.url)}>Copy invitation link</button></> : <div className="invite-placeholder"><div>QR</div><strong>No invitation generated</strong><p>Select a unit to create its QR code and backup unit code.</p></div>}
      </article>
    </section>
  </main>;
}
