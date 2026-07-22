"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PROPERTY_TYPES = ["Single-Family Home", "Apartment Building", "Duplex", "Triplex", "Townhome", "Condo", "Commercial", "Other"];
const EMPTY_FORM = { name: "", address: "", city: "", state: "", zip: "", type: "Single-Family Home", groupId: "", units: "1", notes: "", photo: "" };

function Icon({ name }) {
  const paths = {
    back: <path d="m15 18-6-6 6-6"/>, plus: <><path d="M12 5v14M5 12h14"/></>, search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>, home: <><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></>, edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></>, archive: <><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></>, trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>, close: <><path d="M18 6 6 18M6 6l12 12"/></>, image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>, folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>, units: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/></>
  };
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

async function compressImage(file) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = dataUrl;
  });
  const maxWidth = 900, maxHeight = 600;
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL("image/jpeg", 0.72);
  if (compressed.length > 600000) throw new Error("That photo is still too large. Choose a smaller image.");
  return compressed;
}

export default function PropertiesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [groups, setGroups] = useState([]);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) return router.replace("/sign-in");
      if (data.user.user_metadata?.account_type === "tenant") return router.replace("/dashboard");
      setUser(data.user);
      setProperties(data.user.user_metadata?.properties || []);
      setGroups(data.user.user_metadata?.property_groups || []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  const filtered = useMemo(() => properties.filter((property) => {
    if (!!property.archived !== showArchived) return false;
    if (groupFilter === "ungrouped" && property.groupId) return false;
    if (groupFilter !== "all" && groupFilter !== "ungrouped" && property.groupId !== groupFilter) return false;
    const haystack = `${property.name} ${property.address} ${property.city} ${property.state} ${property.zip} ${property.type}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [properties, query, groupFilter, showArchived]);

  function openAdd() { setEditingId(null); setForm(EMPTY_FORM); setError(""); setModalOpen(true); }
  function openEdit(property) { setEditingId(property.id); setForm({ ...EMPTY_FORM, ...property, units: String(property.units || 1) }); setError(""); setModalOpen(true); }

  async function persist(nextProperties) {
    const nextGroups = groups.map((group) => ({ ...group, propertyCount: nextProperties.filter((property) => !property.archived && property.groupId === group.id).length }));
    const { data, error: updateError } = await supabase.auth.updateUser({ data: { properties: nextProperties, property_groups: nextGroups } });
    if (updateError) throw updateError;
    setProperties(nextProperties); setGroups(nextGroups); setUser(data.user);
  }

  async function saveProperty(event) {
    event.preventDefault(); setError("");
    if (!form.name.trim()) return setError("Enter a property name.");
    if (!form.address.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim()) return setError("Complete the property address.");
    const unitCount = Number(form.units);
    if (!Number.isInteger(unitCount) || unitCount < 1 || unitCount > 999) return setError("Units must be a whole number between 1 and 999.");
    if (!editingId && properties.filter((property) => !property.archived).length >= 5 && (user?.user_metadata?.plan || "free") === "free") return setError("The Free plan supports up to 5 active properties.");
    setSaving(true);
    try {
      const clean = { ...form, name: form.name.trim(), address: form.address.trim(), city: form.city.trim(), state: form.state.trim().toUpperCase(), zip: form.zip.trim(), notes: form.notes.trim(), units: unitCount, updatedAt: new Date().toISOString() };
      const next = editingId ? properties.map((property) => property.id === editingId ? { ...property, ...clean } : property) : [...properties, { ...clean, id: crypto.randomUUID(), archived: false, createdAt: new Date().toISOString() }];
      await persist(next); setModalOpen(false);
    } catch (err) { setError(err.message || "Unable to save the property."); }
    finally { setSaving(false); }
  }

  async function archiveProperty(property) {
    if (!window.confirm(`${property.archived ? "Restore" : "Archive"} “${property.name}”?`)) return;
    try { await persist(properties.map((item) => item.id === property.id ? { ...item, archived: !item.archived, updatedAt: new Date().toISOString() } : item)); }
    catch (err) { window.alert(err.message); }
  }

  async function deleteProperty(property) {
    const typed = window.prompt(`Permanently delete “${property.name}”? Type the property name exactly to confirm.`);
    if (typed !== property.name) return;
    try { await persist(properties.filter((item) => item.id !== property.id)); }
    catch (err) { window.alert(err.message); }
  }

  async function selectPhoto(event) {
    try { const photo = await compressImage(event.target.files?.[0]); setForm((current) => ({ ...current, photo })); setError(""); }
    catch (err) { setError(err.message); }
  }

  if (loading) return <main className="dashboard-loading"><img src="/tamlynk-logo.png" alt="" /><p>Loading properties...</p></main>;

  return <main className="properties-shell">
    <header className="properties-topbar">
      <div><Link href="/dashboard" className="back-link"><Icon name="back" /> Dashboard</Link><span className="auth-kicker">Portfolio</span><h1>Properties</h1><p>Add, organize, and manage every property from one place.</p></div>
      <button className="button" onClick={openAdd}><Icon name="plus" /> Add Property</button>
    </header>

    <section className="property-summary-row">
      <article><small>Active properties</small><strong>{properties.filter((item) => !item.archived).length}</strong><span>of {(user?.user_metadata?.plan || "free") === "free" ? 5 : 25} included</span></article>
      <article><small>Total units</small><strong>{properties.filter((item) => !item.archived).reduce((sum, item) => sum + Number(item.units || 0), 0)}</strong><span>Across your portfolio</span></article>
      <article><small>Property groups</small><strong>{groups.length}</strong><span>Optional organization</span></article>
    </section>

    <section className="property-toolbar">
      <label className="property-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search properties or addresses" /></label>
      <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="all">All groups</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}<option value="ungrouped">Ungrouped</option></select>
      <button className={`archive-toggle ${showArchived ? "active" : ""}`} onClick={() => setShowArchived((value) => !value)}><Icon name="archive" /> {showArchived ? "Viewing archived" : "Archived"}</button>
    </section>

    {filtered.length ? <section className="property-card-grid">{filtered.map((property) => {
      const group = groups.find((item) => item.id === property.groupId);
      return <article className="property-card" key={property.id}>
        <div className="property-photo">{property.photo ? <img src={property.photo} alt="" /> : <span><Icon name="home" /></span>}<em>{property.type}</em></div>
        <div className="property-card-body"><div className="property-title-row"><div><h2>{property.name}</h2><p>{property.address}, {property.city}, {property.state} {property.zip}</p></div></div>
          <div className="property-meta"><span><Icon name="units" /><strong>{property.units}</strong> {Number(property.units) === 1 ? "unit" : "units"}</span><span><Icon name="folder" />{group?.name || "Ungrouped"}</span></div>
          {property.notes && <p className="property-notes">{property.notes}</p>}
          <div className="property-card-actions"><button onClick={() => openEdit(property)}><Icon name="edit" /> Edit</button><button onClick={() => archiveProperty(property)}><Icon name="archive" /> {property.archived ? "Restore" : "Archive"}</button>{property.archived && <button className="danger" onClick={() => deleteProperty(property)}><Icon name="trash" /> Delete</button>}</div>
        </div>
      </article>;
    })}</section> : <section className="properties-empty"><span><Icon name={showArchived ? "archive" : "home"} /></span><h2>{showArchived ? "No archived properties" : query || groupFilter !== "all" ? "No properties match those filters" : "Add your first property"}</h2><p>{showArchived ? "Properties you archive will stay safely stored here." : "Create a property now, then you’ll be ready to add units and connect tenants."}</p>{!showArchived && !query && groupFilter === "all" && <button className="button" onClick={openAdd}><Icon name="plus" /> Add Property</button>}</section>}

    {modalOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}><section className="app-modal property-modal" role="dialog" aria-modal="true">
      <button className="icon-button modal-close" onClick={() => setModalOpen(false)} aria-label="Close"><Icon name="close" /></button>
      <span className="modal-icon"><Icon name="home" /></span><h2>{editingId ? "Edit property" : "Add a property"}</h2><p>Keep the setup simple. Units and tenants are added after the property is saved.</p>
      <form onSubmit={saveProperty} className="property-form">
        <label className="photo-picker">{form.photo ? <img src={form.photo} alt="Property preview" /> : <span><Icon name="image" /><strong>Add property photo</strong><small>JPG or PNG</small></span>}<input type="file" accept="image/*" onChange={selectPhoto} /></label>
        <div className="form-grid two"><label>Property name<input value={form.name} onChange={(e) => setForm({...form, name:e.target.value})} placeholder="Sunset Apartments" autoFocus /></label><label>Property type<select value={form.type} onChange={(e) => setForm({...form, type:e.target.value})}>{PROPERTY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label></div>
        <label>Street address<input value={form.address} onChange={(e) => setForm({...form, address:e.target.value})} placeholder="123 Main Street" /></label>
        <div className="form-grid address"><label>City<input value={form.city} onChange={(e) => setForm({...form, city:e.target.value})} /></label><label>State<input value={form.state} onChange={(e) => setForm({...form, state:e.target.value})} maxLength={2} placeholder="IL" /></label><label>ZIP code<input value={form.zip} onChange={(e) => setForm({...form, zip:e.target.value})} inputMode="numeric" /></label></div>
        <div className="form-grid two"><label>Property group<select value={form.groupId} onChange={(e) => setForm({...form, groupId:e.target.value})}><option value="">Ungrouped</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label>Number of units<input type="number" min="1" max="999" value={form.units} onChange={(e) => setForm({...form, units:e.target.value})} /></label></div>
        <label>Notes <small className="optional-label">Optional</small><textarea rows="3" value={form.notes} onChange={(e) => setForm({...form, notes:e.target.value})} placeholder="Gate codes, ownership notes, or anything helpful..." /></label>
        {error && <p className="form-message error-message">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="button" disabled={saving}>{saving ? "Saving..." : editingId ? "Save Changes" : "Add Property"}</button></div>
      </form>
    </section></div>}
  </main>;
}
