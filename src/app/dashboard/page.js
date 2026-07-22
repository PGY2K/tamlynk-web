"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const EMPTY_GROUP = "Ungrouped";

function Icon({ name }) {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    properties: <><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></>,
    tenants: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    lease: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8"/></>,
    rent: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M7 15h.01"/></>,
    maintenance: <><path d="M14.7 6.3a4 4 0 0 0-5-5L7 4l3 3-6.5 6.5a2.12 2.12 0 0 0 3 3L13 10l3 3 2.7-2.7a4 4 0 0 0-4-4z"/><path d="m12 12 6 6"/></>,
    documents: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.36.36.68.64.94.28.25.63.4 1.01.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15z"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    folder: <><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
    qr: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="M18 6 6 18M6 6l12 12"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  };
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [groupModal, setGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groups, setGroups] = useState([]);
  const [savingGroup, setSavingGroup] = useState(false);
  const [groupError, setGroupError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) router.replace("/sign-in");
      else {
        setUser(data.user);
        setGroups(data.user.user_metadata?.property_groups || []);
        setLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/sign-in");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const metadata = user?.user_metadata || {};
  const firstName = metadata.full_name?.split(" ")[0] || "there";
  const isTenant = metadata.account_type === "tenant";
  const initials = (metadata.full_name || user?.email || "TL").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const navItems = useMemo(() => isTenant ? [
    ["overview", "Overview"], ["rent", "Payments"], ["maintenance", "Maintenance"], ["lease", "Lease"], ["documents", "Documents"]
  ] : [
    ["overview", "Overview"], ["properties", "Properties"], ["tenants", "Tenants"], ["lease", "Leases"], ["rent", "Rent"], ["maintenance", "Maintenance"], ["documents", "Documents"]
  ], [isTenant]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/sign-in");
  }

  async function addGroup(event) {
    event.preventDefault();
    const cleanName = groupName.trim();
    setGroupError("");
    if (!cleanName) return setGroupError("Enter a group name.");
    if (cleanName.toLowerCase() === EMPTY_GROUP.toLowerCase()) return setGroupError("Ungrouped is reserved by TamLynk.");
    if (groups.some((group) => group.name.toLowerCase() === cleanName.toLowerCase())) return setGroupError("A group with that name already exists.");

    setSavingGroup(true);
    const nextGroups = [...groups, { id: crypto.randomUUID(), name: cleanName, propertyCount: 0 }];
    const { data, error } = await supabase.auth.updateUser({ data: { property_groups: nextGroups } });
    setSavingGroup(false);
    if (error) return setGroupError(error.message);
    setGroups(nextGroups);
    setUser(data.user);
    setGroupName("");
    setGroupModal(false);
  }

  async function deleteGroup(groupId) {
    const group = groups.find((item) => item.id === groupId);
    if (!group || !window.confirm(`Delete the “${group.name}” group? Properties in it will remain safe and can be reassigned later.`)) return;
    const nextGroups = groups.filter((group) => group.id !== groupId);
    const { data, error } = await supabase.auth.updateUser({ data: { property_groups: nextGroups } });
    if (!error) {
      setGroups(nextGroups);
      setUser(data.user);
    }
  }

  if (loading) return <main className="dashboard-loading"><img src="/tamlynk-logo.png" alt="" /><p>Loading your dashboard...</p></main>;

  return (
    <main className="app-shell">
      <aside className={`app-sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="sidebar-top-row">
          <Link className="brand" href="/"><img src="/tamlynk-logo.png" alt="" /><span>TamLynk</span></Link>
          <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><Icon name="close" /></button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar">{initials}</span>
          <div><strong>{metadata.full_name || "My workspace"}</strong><small>{isTenant ? "Tenant account" : `${(metadata.plan || "free").replace(/^./, (c) => c.toUpperCase())} plan`}</small></div>
        </div>

        <nav className="primary-nav">
          <small>Workspace</small>
          {navItems.map(([icon, label], index) => label === "Properties" ? (
            <Link className="primary-nav-link" href="/properties" key={label}><Icon name={icon} /><span>{label}</span></Link>
          ) : (
            <button className={index === 0 ? "active" : ""} key={label} type="button"><Icon name={icon} /><span>{label}</span>{label === "Maintenance" && <em>0</em>}</button>
          ))}
        </nav>

        {!isTenant && (
          <div className="sidebar-groups">
            <div className="sidebar-section-heading"><small>Property groups</small><button onClick={() => setGroupModal(true)} aria-label="Create property group"><Icon name="plus" /></button></div>
            <button className="group-link" type="button"><Icon name="folder" /><span>All Properties</span><em>0</em></button>
            {groups.map((group) => <button className="group-link" type="button" key={group.id}><span className="group-dot" /><span>{group.name}</span><em>{group.propertyCount || 0}</em></button>)}
            <button className="group-link muted" type="button"><span className="group-dot" /><span>{EMPTY_GROUP}</span><em>0</em></button>
          </div>
        )}

        <div className="sidebar-bottom">
          <button type="button"><Icon name="settings" /><span>Settings</span></button>
          <button className="sidebar-signout" onClick={signOut}>Sign Out</button>
        </div>
      </aside>
      {mobileNav && <button className="sidebar-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <section className="app-content">
        <header className="app-topbar">
          <button className="icon-button mobile-nav-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Icon name="menu" /></button>
          <div className="topbar-title"><small>{isTenant ? "Tenant portal" : "Management dashboard"}</small><strong>Overview</strong></div>
          <div className="topbar-actions">
            <button className="icon-button notification-button" aria-label="Notifications"><Icon name="bell" /><span /></button>
            <div className="dashboard-user"><span>{initials}</span><div><strong>{metadata.full_name || "TamLynk User"}</strong><small>{user.email}</small></div></div>
          </div>
        </header>

        <div className="dashboard-page-head">
          <div><span className="auth-kicker">{isTenant ? "Your rental, all in one place" : "Portfolio overview"}</span><h1>Welcome back, {firstName}.</h1><p>{isTenant ? "Your lease, payments, maintenance, and documents will appear here." : "Here’s what’s happening across your properties today."}</p></div>
          {!isTenant && <div className="page-actions"><button className="button button-secondary"><Icon name="qr" /> Generate QR</button><Link className="button" href="/properties"><Icon name="plus" /> Add Property</Link></div>}
        </div>

        {isTenant ? <TenantDashboard /> : <LandlordDashboard groups={groups} openGroups={() => setGroupModal(true)} deleteGroup={deleteGroup} properties={metadata.properties || []} />}
      </section>

      {groupModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setGroupModal(false)}>
          <section className="app-modal" role="dialog" aria-modal="true" aria-labelledby="group-modal-title">
            <button className="icon-button modal-close" onClick={() => setGroupModal(false)} aria-label="Close"><Icon name="close" /></button>
            <span className="modal-icon"><Icon name="folder" /></span>
            <h2 id="group-modal-title">Create a property group</h2>
            <p>Use groups to keep larger portfolios organized. You can assign properties later.</p>
            <form onSubmit={addGroup}>
              <label>Group name<input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Example: Downtown Properties" autoFocus maxLength={50} /></label>
              {groupError && <p className="form-message error-message">{groupError}</p>}
              <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setGroupModal(false)}>Cancel</button><button className="button" disabled={savingGroup}>{savingGroup ? "Creating..." : "Create Group"}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function LandlordDashboard({ groups, openGroups, deleteGroup, properties }) {
  const activeProperties = properties.filter((property) => !property.archived);
  const totalUnits = activeProperties.reduce((sum, property) => sum + Number(property.units || 0), 0);
  return <>
    <div className="dashboard-stat-grid polished">
      <article><span className="stat-icon purple"><Icon name="properties" /></span><div><small>Properties</small><strong>{activeProperties.length}</strong><p>5 included on Free</p></div><span className="stat-trend">{activeProperties.length ? `${totalUnits} total units` : "Ready to add"}</span></article>
      <article><span className="stat-icon lavender"><Icon name="tenants" /></span><div><small>Occupancy</small><strong>—</strong><p>No units added yet</p></div><span className="stat-trend neutral">0 tenants</span></article>
      <article><span className="stat-icon green"><Icon name="rent" /></span><div><small>Monthly rent</small><strong>$0</strong><p>Nothing due yet</p></div><span className="stat-trend neutral">$0 collected</span></article>
      <article><span className="stat-icon amber"><Icon name="maintenance" /></span><div><small>Open maintenance</small><strong>0</strong><p>Everything is clear</p></div><span className="stat-trend success">No action needed</span></article>
    </div>

    <div className="dashboard-main-grid">
      <section className="dashboard-card activity-card">
        <div className="card-heading"><div><h2>Recent activity</h2><p>Updates across your TamLynk workspace</p></div><button className="text-link">View all</button></div>
        <div className="timeline-empty"><span className="empty-illustration"><Icon name="overview" /></span><h3>Your activity will appear here</h3><p>Property updates, tenant connections, rent activity, and maintenance requests will be easy to follow.</p></div>
      </section>

      <section className="dashboard-card quick-actions-card">
        <div className="card-heading"><div><h2>Quick actions</h2><p>Common tasks, one click away</p></div></div>
        <div className="quick-action-grid">
          <Link href="/properties"><span><Icon name="properties" /></span><strong>Add property</strong><small>Create or manage properties</small></Link>
          <button onClick={openGroups}><span><Icon name="folder" /></span><strong>Create group</strong><small>Organize your portfolio</small></button>
          <button><span><Icon name="qr" /></span><strong>Generate QR</strong><small>Connect a tenant in seconds</small></button>
          <button><span><Icon name="tenants" /></span><strong>View tenants</strong><small>Manage connected renters</small></button>
        </div>
      </section>
    </div>

    <section className="dashboard-card groups-card">
      <div className="card-heading"><div><h2>Property groups</h2><p>Optional folders that make larger portfolios easier to navigate</p></div><button className="button button-small button-secondary" onClick={openGroups}><Icon name="plus" /> New Group</button></div>
      {groups.length ? <div className="group-card-grid">{groups.map((group) => <article key={group.id}><span className="group-card-icon"><Icon name="folder" /></span><div><strong>{group.name}</strong><small>{group.propertyCount || 0} properties</small></div><button className="icon-button" aria-label={`Delete ${group.name}`} onClick={() => deleteGroup(group.id)}><Icon name="more" /></button></article>)}</div> : <div className="inline-empty"><span><Icon name="folder" /></span><div><strong>No property groups yet</strong><p>Create a group for locations, property types, clients, or any organization style that works for you.</p></div><button className="text-link" onClick={openGroups}>Create your first group</button></div>}
    </section>
  </>;
}

function TenantDashboard() {
  return <>
    <div className="dashboard-stat-grid polished tenant-stats">
      <article><span className="stat-icon purple"><Icon name="properties" /></span><div><small>Current property</small><strong>Not linked</strong><p>Scan a landlord QR to connect</p></div></article>
      <article><span className="stat-icon green"><Icon name="rent" /></span><div><small>Amount due</small><strong>$0</strong><p>No balance due</p></div></article>
      <article><span className="stat-icon amber"><Icon name="maintenance" /></span><div><small>Open maintenance</small><strong>0</strong><p>No open requests</p></div></article>
    </div>
    <section className="dashboard-card tenant-connect-card"><span className="modal-icon"><Icon name="qr" /></span><h2>Connect with your landlord</h2><p>Scan the 24-hour QR code provided by your landlord. You’ll be automatically connected to the correct property and unit after signing in.</p><button className="button"><Icon name="qr" /> Scan QR Code</button></section>
  </>;
}
