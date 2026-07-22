"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) router.replace("/sign-in");
      else {
        setUser(data.user);
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

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/sign-in");
  }

  if (loading) return <main className="dashboard-loading"><img src="/tamlynk-logo.png" alt="" /><p>Loading your dashboard...</p></main>;

  const metadata = user.user_metadata || {};
  const firstName = metadata.full_name?.split(" ")[0] || "there";
  const isTenant = metadata.account_type === "tenant";

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <Link className="brand" href="/"><img src="/tamlynk-logo.png" alt="" /><span>TamLynk</span></Link>
        <nav>
          <a className="active" href="#">Overview</a>
          {isTenant ? <><a href="#">Payments</a><a href="#">Maintenance</a><a href="#">Lease</a><a href="#">Documents</a></> : <><a href="#">Properties</a><a href="#">Tenants</a><a href="#">Leases</a><a href="#">Rent</a><a href="#">Maintenance</a><a href="#">Documents</a></>}
        </nav>
        <button className="sidebar-signout" onClick={signOut}>Sign Out</button>
      </aside>

      <section className="app-content">
        <header className="dashboard-header">
          <div><span className="auth-kicker">{isTenant ? "Tenant portal" : "Management dashboard"}</span><h1>Welcome, {firstName}.</h1><p>Your TamLynk workspace is ready.</p></div>
          <div className="dashboard-user"><span>{(metadata.full_name || user.email).slice(0, 2).toUpperCase()}</span><div><strong>{metadata.full_name || "TamLynk User"}</strong><small>{user.email}</small></div></div>
        </header>

        <div className="dashboard-banner">
          <div><span>Account connected</span><h2>Your secure TamLynk account is active.</h2><p>{isTenant ? "Your landlord will be able to connect you to a property and lease as tenant features are released." : "Start by adding your first property when property management launches in the next update."}</p></div>
          <div className="dashboard-plan"><small>Current plan</small><strong>{(metadata.plan || "free").toUpperCase()}</strong></div>
        </div>

        <div className="dashboard-stat-grid">
          <article><span>Properties</span><strong>0</strong><small>{isTenant ? "No property linked yet" : "5 included on Free"}</small></article>
          <article><span>{isTenant ? "Amount due" : "Active tenants"}</span><strong>{isTenant ? "$0" : "0"}</strong><small>Nothing requires attention</small></article>
          <article><span>Open maintenance</span><strong>0</strong><small>No open requests</small></article>
        </div>

        <section className="dashboard-empty-state">
          <div className="feature-icon">⌂</div>
          <h2>{isTenant ? "Your tenant portal is ready." : "Add your first property next."}</h2>
          <p>{isTenant ? "Once your rental is linked, this dashboard will show rent, lease details, maintenance, and documents." : "The next TamLynk feature will let you create properties, add units, and begin organizing your portfolio."}</p>
          {!isTenant && <button className="button" disabled>Add Property — Coming Next</button>}
        </section>
      </section>
    </main>
  );
}
