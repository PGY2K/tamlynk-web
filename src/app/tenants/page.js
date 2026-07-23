"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const EMPTY_FORM = {
  full_name: "",
  email: "",
  phone: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  notes: "",
  status: "pending",
};

function Icon({ name }) {
  const paths = {
    back: <><path d="m15 18-6-6 6-6"/></>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
    user: <><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></>,
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.62a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.28-1.28a2 2 0 0 1 2.11-.45c.84.29 1.72.5 2.62.62A2 2 0 0 1 22 16.92z"/></>,
    home: <><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
    close: <><path d="M18 6 6 18M6 6l12 12"/></>,
  };
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function initials(name, email) {
  return (name || email || "T").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function TenantsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!active) return;
      if (!authData.user) return router.replace("/sign-in");
      if (authData.user.user_metadata?.account_type === "tenant") return router.replace("/dashboard");
      setUser(authData.user);

      const [{ data, error: loadError }, { data: historyData, error: historyError }] = await Promise.all([supabase
        .from("tenant_profiles")
        .select("*")
        .eq("landlord_id", authData.user.id)
        .order("created_at", { ascending: false }),
        supabase.from("occupancy_history").select("id, tenant_profile_id, property_name, unit_name, moved_in_at, moved_out_at").eq("landlord_id", authData.user.id).order("moved_in_at", { ascending: false })
      ]);

      if (!active) return;
      if (loadError) setError(loadError.message);
      if (historyError && historyError.code !== "42P01") setError(historyError.message);
      setTenants(data || []);
      setHistory(historyData || []);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  const shown = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
      const haystack = `${tenant.full_name || ""} ${tenant.email || ""} ${tenant.phone || ""} ${tenant.property_name || ""} ${tenant.unit_name || ""}`.toLowerCase();
      return matchesStatus && (!clean || haystack.includes(clean));
    });
  }, [tenants, query, statusFilter]);

  const totals = useMemo(() => ({
    active: tenants.filter((tenant) => tenant.status === "active").length,
    pending: tenants.filter((tenant) => tenant.status === "pending").length,
    former: tenants.filter((tenant) => tenant.status === "former").length,
  }), [tenants]);

  function openProfile(tenant) {
    setEditing(tenant);
    setForm({
      full_name: tenant.full_name || "",
      email: tenant.email || "",
      phone: tenant.phone || "",
      emergency_contact_name: tenant.emergency_contact_name || "",
      emergency_contact_phone: tenant.emergency_contact_phone || "",
      notes: tenant.notes || "",
      status: tenant.status || "pending",
    });
    setError("");
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!editing) return;
    if (!form.full_name.trim()) return setError("Enter the tenant's name.");
    if (!form.email.trim()) return setError("Enter the tenant's email address.");

    setSaving(true);
    setError("");
    const updates = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      emergency_contact_name: form.emergency_contact_name.trim(),
      emergency_contact_phone: form.emergency_contact_phone.trim(),
      notes: form.notes.trim(),
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    const { data, error: saveError } = await supabase
      .from("tenant_profiles")
      .update(updates)
      .eq("id", editing.id)
      .eq("landlord_id", user.id)
      .select()
      .single();

    setSaving(false);
    if (saveError) return setError(saveError.message);
    setTenants((current) => current.map((tenant) => tenant.id === data.id ? data : tenant));
    setEditing(null);
  }

  if (loading) return <main className="dashboard-loading"><img src="/tamlynk-logo.png" alt=""/><p>Loading tenant profiles...</p></main>;

  return <main className="properties-shell tenant-profiles-shell">
    <header className="properties-topbar">
      <div>
        <Link href="/dashboard" className="back-link"><Icon name="back"/> Dashboard</Link>
        <span className="auth-kicker">Tenant management</span>
        <h1>Tenant Profiles</h1>
        <p>View contact information, emergency contacts, unit assignments, status, and private notes.</p>
      </div>
    </header>

    <section className="property-summary-row tenant-summary-row">
      <article><small>All tenants</small><strong>{tenants.length}</strong></article>
      <article><small>Active</small><strong>{totals.active}</strong></article>
      <article><small>Pending</small><strong>{totals.pending}</strong></article>
      <article><small>Former</small><strong>{totals.former}</strong></article>
    </section>

    <section className="property-toolbar">
      <label className="property-search"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tenants, properties, or units"/></label>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="former">Former</option>
      </select>
    </section>

    {error && !editing && <p className="form-message error-message tenant-page-error">{error}</p>}

    {shown.length ? <section className="tenant-card-grid">
      {shown.map((tenant) => <article className="tenant-profile-card" key={tenant.id}>
        <div className="tenant-profile-head">
          <span className="tenant-avatar">{initials(tenant.full_name, tenant.email)}</span>
          <span className={`tenant-status ${tenant.status}`}>{tenant.status}</span>
        </div>
        <h2>{tenant.full_name || "Tenant"}</h2>
        <a href={`mailto:${tenant.email}`}>{tenant.email || "No email"}</a>
        <div className="tenant-profile-facts">
          <div><Icon name="phone"/><span><small>Phone</small><strong>{tenant.phone || "Not added"}</strong></span></div>
          <div><Icon name="home"/><span><small>Current property</small><strong>{tenant.property_name || "Not assigned"}</strong><em>{tenant.unit_name || "No unit"}</em></span></div>
        </div>
        <button className="tenant-profile-button" onClick={() => openProfile(tenant)}><Icon name="edit"/> View and edit profile</button>
      </article>)}
    </section> : <section className="properties-empty">
      <span><Icon name="user"/></span>
      <h2>{tenants.length ? "No tenants match your filters" : "No tenant profiles yet"}</h2>
      <p>{tenants.length ? "Try another search or status." : "Profiles are created automatically when a tenant connects to one of your units."}</p>
      {!tenants.length && <Link className="button" href="/invitations">Generate Tenant QR</Link>}
    </section>}

    {editing && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
      <section className="app-modal property-modal tenant-profile-modal">
        <button className="icon-button modal-close" onClick={() => setEditing(null)} aria-label="Close"><Icon name="close"/></button>
        <span className="modal-icon"><Icon name="user"/></span>
        <h2>{editing.full_name || "Tenant profile"}</h2>
        <p>Property and unit are automatically provided by the tenant's current assignment.</p>

        <div className="tenant-assignment-banner">
          <div><small>Current property</small><strong>{editing.property_name || "Not assigned"}</strong></div>
          <div><small>Current unit</small><strong>{editing.unit_name || "Not assigned"}</strong></div>
        </div>


        <section className="tenant-rental-history">
          <div className="card-heading"><div><h3>Rental history</h3><p>Permanent property and unit assignments.</p></div></div>
          {history.filter((record) => record.tenant_profile_id === editing.id).length ? <div className="occupancy-timeline compact">
            {history.filter((record) => record.tenant_profile_id === editing.id).map((record) => <article key={record.id} className={!record.moved_out_at ? "current" : ""}>
              <span className="timeline-dot"/>
              <div><div className="history-row-heading"><strong>{record.property_name || "Property"} · {record.unit_name || "Unit"}</strong>{!record.moved_out_at && <em>Current</em>}</div><p>{new Date(record.moved_in_at).toLocaleDateString()} – {record.moved_out_at ? new Date(record.moved_out_at).toLocaleDateString() : "Present"}</p></div>
            </article>)}
          </div> : <p className="tenant-muted">No occupancy records yet.</p>}
        </section>

        <form className="property-form" onSubmit={saveProfile}>
          <div className="form-grid two">
            <label>Name<input value={form.full_name} onChange={(event) => setForm({...form, full_name: event.target.value})}/></label>
            <label>Status<select value={form.status} onChange={(event) => setForm({...form, status: event.target.value})}><option value="active">Active</option><option value="pending">Pending</option><option value="former">Former</option></select></label>
          </div>
          <div className="form-grid two">
            <label>Email<input type="email" value={form.email} onChange={(event) => setForm({...form, email: event.target.value})}/></label>
            <label>Phone<input type="tel" value={form.phone} onChange={(event) => setForm({...form, phone: event.target.value})} placeholder="(555) 555-5555"/></label>
          </div>
          <div className="form-grid two">
            <label>Emergency contact<input value={form.emergency_contact_name} onChange={(event) => setForm({...form, emergency_contact_name: event.target.value})} placeholder="Full name"/></label>
            <label>Emergency contact phone<input type="tel" value={form.emergency_contact_phone} onChange={(event) => setForm({...form, emergency_contact_phone: event.target.value})} placeholder="(555) 555-5555"/></label>
          </div>
          <label>Notes <small className="optional-label">Private to management</small><textarea value={form.notes} onChange={(event) => setForm({...form, notes: event.target.value})} placeholder="Add helpful tenant notes..."/></label>
          {error && <p className="form-message error-message">{error}</p>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="button" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button></div>
        </form>
      </section>
    </div>}
  </main>;
}
