"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatUnitCode } from "@/lib/unitCodes";

function formatDate(value) {
  if (!value) return "Present";
  return new Date(value.includes?.("T") ? value : `${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const EMPTY_LEASE = { templateId: "", leaseStart: "", leaseEnd: "", monthlyRent: "", securityDeposit: "", notes: "" };

export default function UnitDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState();
  const [user, setUser] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [leases, setLeases] = useState([]);
  const [leaseForm, setLeaseForm] = useState(EMPTY_LEASE);
  const [savingLease, setSavingLease] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return router.replace("/sign-in");
    setUser(authData.user);

    const properties = authData.user.user_metadata?.properties || [];
    let found = null;
    for (const property of properties) {
      const unit = (property.unitRecords || []).find((record) => record.id === id);
      if (unit) { found = { unit, property }; break; }
    }
    if (!found) { setData(null); return; }

    const [assignmentResult, historyResult, templateResult, leaseResult] = await Promise.all([
      supabase.from("tenant_profiles").select("id, full_name, email, status, connected_at").eq("landlord_id", authData.user.id).eq("property_id", found.property.id).eq("unit_id", found.unit.id).eq("status", "active").order("connected_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("occupancy_history").select("id, tenant_profile_id, tenant_name, tenant_email, property_name, unit_name, moved_in_at, moved_out_at").eq("landlord_id", authData.user.id).eq("property_id", found.property.id).eq("unit_id", found.unit.id).order("moved_in_at", { ascending: false }),
      supabase.from("lease_templates").select("*").eq("landlord_id", authData.user.id).order("name"),
      supabase.from("unit_leases").select("*").eq("landlord_id", authData.user.id).eq("property_id", found.property.id).eq("unit_id", found.unit.id).order("created_at", { ascending: false }),
    ]);

    if (assignmentResult.error) setError(assignmentResult.error.message);
    if (historyResult.error && historyResult.error.code !== "42P01") setError(historyResult.error.message);
    if (templateResult.error && templateResult.error.code !== "42P01") setError(templateResult.error.message);
    if (leaseResult.error && leaseResult.error.code !== "42P01") setError(leaseResult.error.message);
    setTemplates(templateResult.data || []);
    setLeases(leaseResult.data || []);
    setData({ ...found, assignment: assignmentResult.data || null, history: historyResult.data || [] });
  }

  useEffect(() => { load(); }, [id, router]);

  async function assignLease(event) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!leaseForm.templateId) return setError("Choose a lease template.");
    if (!leaseForm.leaseStart) return setError("Enter a lease start date.");
    setSavingLease(true);
    const { error: saveError } = await supabase.rpc("assign_unit_lease", {
      p_property_id: data.property.id,
      p_property_name: data.property.name,
      p_unit_id: data.unit.id,
      p_unit_name: data.unit.name,
      p_template_id: leaseForm.templateId,
      p_lease_start: leaseForm.leaseStart,
      p_lease_end: leaseForm.leaseEnd || null,
      p_monthly_rent: Number(leaseForm.monthlyRent || 0),
      p_security_deposit: Number(leaseForm.securityDeposit || 0),
      p_notes: leaseForm.notes.trim(),
    });
    setSavingLease(false);
    if (saveError) return setError(saveError.message);
    setLeaseForm(EMPTY_LEASE);
    setMessage("Lease reference attached to this unit.");
    await load();
  }

  async function viewTemplate(lease) {
    const template = templates.find((item) => item.id === lease.template_id);
    if (!template) return setError("The lease PDF could not be found.");
    const { data: signed, error: signedError } = await supabase.storage.from("lease-templates").createSignedUrl(template.storage_path, 600);
    if (signedError) return setError(signedError.message);
    window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (data === undefined) return <main className="dashboard-loading"><p>Loading unit...</p></main>;
  if (!data) return <main className="properties-shell"><section className="properties-empty"><h2>Unit not found</h2><Link className="button" href="/units">Back to Units</Link></section></main>;

  const { unit, property, assignment, history } = data;
  const openHistory = history.find((record) => !record.moved_out_at);
  const occupied = Boolean(assignment || openHistory) || unit.status === "occupied";
  const tenantName = assignment?.full_name || openHistory?.tenant_name || unit.tenantName || "Tenant connected";
  const tenantEmail = assignment?.email || openHistory?.tenant_email || unit.tenantEmail || "—";
  const activeLease = leases.find((lease) => lease.status === "active");

  return <main className="properties-shell">
    <header className="properties-topbar">
      <div><Link className="back-link" href="/units">← Units</Link><span className="auth-kicker">{property.name}</span><h1>{unit.name}</h1><p>{property.address}, {property.city}, {property.state} {property.zip}</p></div>
      <div className="unit-detail-actions"><span className={`unit-detail-status ${occupied ? "occupied" : "vacant"}`}>{occupied ? "occupied" : "vacant"}</span><Link className="button" href={`/invitations?unit=${unit.id}`}>Generate tenant QR</Link></div>
    </header>

    <section className="unit-detail-grid"><article><small>Monthly rent</small><strong>${Number(unit.rent || 0).toLocaleString()}</strong></article><article><small>Bedrooms</small><strong>{unit.bedrooms}</strong></article><article><small>Bathrooms</small><strong>{unit.bathrooms}</strong></article><article><small>Backup unit code</small><strong className="detail-unit-code">{unit.unitCode ? formatUnitCode(unit.unitCode) : "Not generated"}</strong></article></section>

    <section className="dashboard-card unit-detail-card"><h2>Current occupancy</h2><div className="unit-detail-row"><div><small>Current tenant</small><strong>{occupied ? tenantName : "Vacant"}</strong></div><div><small>Email</small><strong>{occupied ? tenantEmail : "—"}</strong></div></div>{unit.notes && <><h2>Notes</h2><p>{unit.notes}</p></>}</section>

    <section className="dashboard-card unit-lease-card">
      <div className="card-heading"><div><h2>Lease reference</h2><p>Attach a reusable PDF from your Lease Library and record the unit terms.</p></div><Link className="button button-small button-secondary" href="/leases">Open Lease Library</Link></div>
      {activeLease && <div className="active-unit-lease"><div><small>Lease Template / Reference Copy</small><h3>{activeLease.template_name}</h3><button className="text-action" onClick={() => viewTemplate(activeLease)}>View PDF</button></div><div className="lease-facts"><span><small>Start</small><strong>{formatDate(activeLease.lease_start)}</strong></span><span><small>End</small><strong>{activeLease.lease_end ? formatDate(activeLease.lease_end) : "Open-ended"}</strong></span><span><small>Monthly rent</small><strong>${Number(activeLease.monthly_rent || 0).toLocaleString()}</strong></span><span><small>Deposit</small><strong>${Number(activeLease.security_deposit || 0).toLocaleString()}</strong></span></div>{activeLease.notes && <p>{activeLease.notes}</p>}</div>}
      <form className="property-form unit-lease-form" onSubmit={assignLease}>
        <label>Lease template<select value={leaseForm.templateId} onChange={(event) => setLeaseForm({ ...leaseForm, templateId: event.target.value })}><option value="">Choose from library</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
        {!templates.length && <p className="tenant-muted">Upload a PDF in the Lease Library first.</p>}
        <div className="form-grid two"><label>Lease start<input type="date" value={leaseForm.leaseStart} onChange={(event) => setLeaseForm({ ...leaseForm, leaseStart: event.target.value })}/></label><label>Lease end <small className="optional-label">Optional</small><input type="date" value={leaseForm.leaseEnd} onChange={(event) => setLeaseForm({ ...leaseForm, leaseEnd: event.target.value })}/></label></div>
        <div className="form-grid two"><label>Monthly rent<input type="number" min="0" step="0.01" value={leaseForm.monthlyRent} onChange={(event) => setLeaseForm({ ...leaseForm, monthlyRent: event.target.value })}/></label><label>Security deposit<input type="number" min="0" step="0.01" value={leaseForm.securityDeposit} onChange={(event) => setLeaseForm({ ...leaseForm, securityDeposit: event.target.value })}/></label></div>
        <label>Notes <small className="optional-label">Optional</small><textarea value={leaseForm.notes} onChange={(event) => setLeaseForm({ ...leaseForm, notes: event.target.value })}/></label>
        <button className="button" disabled={savingLease || !templates.length}>{savingLease ? "Saving..." : activeLease ? "Replace active lease reference" : "Attach lease reference"}</button>
      </form>
      {(error || message) && <p className={`form-message ${error ? "error-message" : "success-message"}`}>{error || message}</p>}
      {leases.length > 1 && <div className="unit-lease-history"><h3>Lease history</h3>{leases.filter((lease) => lease.id !== activeLease?.id).map((lease) => <article key={lease.id}><div><strong>{lease.template_name}</strong><small>{formatDate(lease.lease_start)} – {lease.lease_end ? formatDate(lease.lease_end) : "Open-ended"}</small></div><span className={`lease-status ${lease.status}`}>{lease.status}</span></article>)}</div>}
    </section>

    <section className="dashboard-card occupancy-history-card">
      <div className="card-heading"><div><h2>Occupancy history</h2><p>A permanent record of everyone assigned to this unit.</p></div><span className="history-count">{history.length} {history.length === 1 ? "record" : "records"}</span></div>
      {history.length ? <div className="occupancy-timeline">{history.map((record) => <article key={record.id} className={!record.moved_out_at ? "current" : ""}><span className="timeline-dot"/><div><div className="history-row-heading"><strong>{record.tenant_name || record.tenant_email || "Tenant"}</strong>{!record.moved_out_at && <em>Current</em>}</div><p>{formatDate(record.moved_in_at)} – {formatDate(record.moved_out_at)}</p><small>{record.tenant_email || "No email recorded"}</small></div></article>)}</div> : <div className="inline-empty occupancy-empty"><div><strong>No occupancy history yet</strong><p>The first record will be created automatically when a tenant connects to this unit.</p></div></div>}
    </section>
  </main>;
}
