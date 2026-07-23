"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function Icon({ name }) {
  const paths = {
    back: <path d="m15 18-6-6 6-6"/>,
    upload: <><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14a2 2 0 0 0 2-2v-4"/><path d="M3 15v4a2 2 0 0 0 2 2"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
    home: <><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  };
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const EMPTY_LEASE = { propertyId: "", unitId: "", templateId: "", leaseStart: "", leaseEnd: "", monthlyRent: "", securityDeposit: "", notes: "" };

export default function LeasesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateFile, setTemplateFile] = useState(null);
  const [leaseForm, setLeaseForm] = useState(EMPTY_LEASE);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData(currentUser) {
    const [{ data: templateData, error: templateError }, { data: leaseData, error: leaseError }] = await Promise.all([
      supabase.from("lease_templates").select("*").eq("landlord_id", currentUser.id).order("created_at", { ascending: false }),
      supabase.from("unit_leases").select("*").eq("landlord_id", currentUser.id).order("created_at", { ascending: false }),
    ]);
    if (templateError) setError(templateError.message);
    else setTemplates(templateData || []);
    if (leaseError) setError(leaseError.message);
    else setLeases(leaseData || []);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) return router.replace("/sign-in");
      if (data.user.user_metadata?.account_type === "tenant") return router.replace("/dashboard");
      setUser(data.user);
      const nextProperties = (data.user.user_metadata?.properties || []).filter((property) => !property.archived);
      setProperties(nextProperties);
      await loadData(data.user);
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  const selectedProperty = properties.find((property) => property.id === leaseForm.propertyId);
  const availableUnits = selectedProperty?.unitRecords || [];
  const activeLeases = useMemo(() => leases.filter((lease) => lease.status === "active"), [leases]);

  async function uploadTemplate(event) {
    event.preventDefault();
    setError(""); setMessage("");
    const cleanName = templateName.trim();
    if (!cleanName) return setError("Enter a name for the lease template.");
    if (!templateFile) return setError("Choose a PDF file.");
    if (templateFile.type !== "application/pdf") return setError("Lease templates must be PDF files.");
    if (templateFile.size > 10 * 1024 * 1024) return setError("The PDF must be 10 MB or smaller.");

    setUploading(true);
    const safeFileName = templateFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`;
    const { error: uploadError } = await supabase.storage.from("lease-templates").upload(storagePath, templateFile, { contentType: "application/pdf", upsert: false });
    if (uploadError) { setUploading(false); return setError(uploadError.message); }

    const { error: insertError } = await supabase.from("lease_templates").insert({ landlord_id: user.id, name: cleanName, file_name: templateFile.name, storage_path: storagePath });
    if (insertError) {
      await supabase.storage.from("lease-templates").remove([storagePath]);
      setUploading(false);
      return setError(insertError.message);
    }
    setTemplateName(""); setTemplateFile(null); setMessage("Lease template uploaded.");
    await loadData(user);
    setUploading(false);
    event.currentTarget.reset();
  }

  async function previewTemplate(template) {
    const { data, error: signedError } = await supabase.storage.from("lease-templates").createSignedUrl(template.storage_path, 600);
    if (signedError) return setError(signedError.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function renameTemplate(template) {
    const nextName = window.prompt("Rename this lease template:", template.name)?.trim();
    if (!nextName || nextName === template.name) return;
    const { error: renameError } = await supabase.from("lease_templates").update({ name: nextName, updated_at: new Date().toISOString() }).eq("id", template.id).eq("landlord_id", user.id);
    if (renameError) return setError(renameError.message);
    setTemplates((current) => current.map((item) => item.id === template.id ? { ...item, name: nextName } : item));
    setLeases((current) => current.map((item) => item.template_id === template.id ? { ...item, template_name: nextName } : item));
  }

  async function deleteTemplate(template) {
    const inUse = leases.some((lease) => lease.template_id === template.id);
    if (inUse) return setError("This template is attached to a lease record and cannot be deleted.");
    if (!window.confirm(`Delete “${template.name}”?`)) return;
    const { error: deleteError } = await supabase.from("lease_templates").delete().eq("id", template.id).eq("landlord_id", user.id);
    if (deleteError) return setError(deleteError.message);
    await supabase.storage.from("lease-templates").remove([template.storage_path]);
    setTemplates((current) => current.filter((item) => item.id !== template.id));
  }

  async function assignLease(event) {
    event.preventDefault();
    setError(""); setMessage("");
    const property = properties.find((item) => item.id === leaseForm.propertyId);
    const unit = property?.unitRecords?.find((item) => item.id === leaseForm.unitId);
    if (!property || !unit) return setError("Choose a property and unit.");
    if (!leaseForm.templateId) return setError("Choose a lease template.");
    if (!leaseForm.leaseStart) return setError("Enter a lease start date.");

    setAssigning(true);
    const { error: assignError } = await supabase.rpc("assign_unit_lease", {
      p_property_id: property.id,
      p_property_name: property.name,
      p_unit_id: unit.id,
      p_unit_name: unit.name,
      p_template_id: leaseForm.templateId,
      p_lease_start: leaseForm.leaseStart,
      p_lease_end: leaseForm.leaseEnd || null,
      p_monthly_rent: Number(leaseForm.monthlyRent || 0),
      p_security_deposit: Number(leaseForm.securityDeposit || 0),
      p_notes: leaseForm.notes.trim(),
    });
    setAssigning(false);
    if (assignError) return setError(assignError.message);
    setLeaseForm(EMPTY_LEASE);
    setMessage("Lease reference attached to the unit.");
    await loadData(user);
  }

  if (loading) return <main className="dashboard-loading"><img src="/tamlynk-logo.png" alt=""/><p>Loading lease library...</p></main>;

  return <main className="properties-shell lease-library-shell">
    <header className="properties-topbar">
      <div><Link href="/dashboard" className="back-link"><Icon name="back"/> Dashboard</Link><span className="auth-kicker">Lease management</span><h1>Lease Library</h1><p>Upload each reference lease once, then reuse it across your properties and units.</p></div>
    </header>

    <section className="lease-library-grid">
      <article className="dashboard-card lease-upload-card">
        <div className="card-heading"><div><h2>Upload a reference lease</h2><p>PDF only. This is clearly shown to tenants as a template or reference copy.</p></div></div>
        <form className="property-form" onSubmit={uploadTemplate}>
          <label>Template name<input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Standard Residential Lease"/></label>
          <label>Lease PDF<input type="file" accept="application/pdf,.pdf" onChange={(event) => setTemplateFile(event.target.files?.[0] || null)}/></label>
          <button className="button" disabled={uploading}><Icon name="upload"/>{uploading ? "Uploading..." : "Upload to library"}</button>
        </form>
      </article>

      <article className="dashboard-card lease-assign-card">
        <div className="card-heading"><div><h2>Attach to a unit</h2><p>Select a saved template and enter the lease details.</p></div></div>
        <form className="property-form" onSubmit={assignLease}>
          <div className="form-grid two"><label>Property<select value={leaseForm.propertyId} onChange={(event) => setLeaseForm({ ...leaseForm, propertyId: event.target.value, unitId: "" })}><option value="">Choose property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label><label>Unit<select value={leaseForm.unitId} disabled={!leaseForm.propertyId} onChange={(event) => setLeaseForm({ ...leaseForm, unitId: event.target.value })}><option value="">Choose unit</option>{availableUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label></div>
          <label>Lease template<select value={leaseForm.templateId} onChange={(event) => setLeaseForm({ ...leaseForm, templateId: event.target.value })}><option value="">Choose from library</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
          <div className="form-grid two"><label>Lease start<input type="date" value={leaseForm.leaseStart} onChange={(event) => setLeaseForm({ ...leaseForm, leaseStart: event.target.value })}/></label><label>Lease end <small className="optional-label">Optional</small><input type="date" value={leaseForm.leaseEnd} onChange={(event) => setLeaseForm({ ...leaseForm, leaseEnd: event.target.value })}/></label></div>
          <div className="form-grid two"><label>Monthly rent<input type="number" min="0" step="0.01" value={leaseForm.monthlyRent} onChange={(event) => setLeaseForm({ ...leaseForm, monthlyRent: event.target.value })}/></label><label>Security deposit<input type="number" min="0" step="0.01" value={leaseForm.securityDeposit} onChange={(event) => setLeaseForm({ ...leaseForm, securityDeposit: event.target.value })}/></label></div>
          <label>Notes <small className="optional-label">Optional</small><textarea value={leaseForm.notes} onChange={(event) => setLeaseForm({ ...leaseForm, notes: event.target.value })}/></label>
          <button className="button" disabled={assigning || !templates.length}><Icon name="plus"/>{assigning ? "Saving..." : "Attach lease reference"}</button>
        </form>
      </article>
    </section>

    {(error || message) && <p className={`form-message ${error ? "error-message" : "success-message"}`}>{error || message}</p>}

    <section className="dashboard-card lease-template-list-card">
      <div className="card-heading"><div><h2>Saved templates</h2><p>Upload once and reuse as many times as needed.</p></div><span className="history-count">{templates.length}</span></div>
      {templates.length ? <div className="lease-template-list">{templates.map((template) => <article key={template.id}><span className="lease-file-icon"><Icon name="file"/></span><div><strong>{template.name}</strong><small>Lease Template / Reference Copy</small><p>{template.file_name}</p></div><div className="lease-template-actions"><button onClick={() => previewTemplate(template)}><Icon name="eye"/> Preview</button><button onClick={() => renameTemplate(template)}><Icon name="edit"/> Rename</button><button className="danger" onClick={() => deleteTemplate(template)}><Icon name="trash"/> Delete</button></div></article>)}</div> : <div className="inline-empty"><div><strong>No lease templates yet</strong><p>Upload your standard PDF once to start attaching it to units.</p></div></div>}
    </section>

    <section className="dashboard-card lease-record-list-card">
      <div className="card-heading"><div><h2>Unit lease records</h2><p>Current and previous reference leases remain available as history.</p></div><span className="history-count">{leases.length}</span></div>
      {leases.length ? <div className="lease-record-table">{leases.map((lease) => <article key={lease.id}><div><strong>{lease.property_name} · {lease.unit_name}</strong><small>{lease.template_name}</small></div><div><small>Dates</small><strong>{new Date(`${lease.lease_start}T00:00:00`).toLocaleDateString()} – {lease.lease_end ? new Date(`${lease.lease_end}T00:00:00`).toLocaleDateString() : "Open-ended"}</strong></div><div><small>Monthly rent</small><strong>${Number(lease.monthly_rent || 0).toLocaleString()}</strong></div><span className={`lease-status ${lease.status}`}>{lease.status}</span></article>)}</div> : <div className="inline-empty"><div><strong>No unit leases yet</strong><p>Attach a saved template to a unit using the form above.</p></div></div>}
    </section>
  </main>;
}
