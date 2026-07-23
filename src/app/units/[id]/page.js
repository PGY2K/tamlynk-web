"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatUnitCode } from "@/lib/unitCodes";

function formatDate(value) {
  if (!value) return "Present";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function UnitDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!active) return;
      if (!authData.user) return router.replace("/sign-in");

      const properties = authData.user.user_metadata?.properties || [];
      let found = null;
      for (const property of properties) {
        const unit = (property.unitRecords || []).find((record) => record.id === id);
        if (unit) {
          found = { unit, property };
          break;
        }
      }

      if (!found) {
        setData(null);
        return;
      }

      const [{ data: assignment, error: assignmentError }, { data: history, error: historyError }] = await Promise.all([
        supabase
          .from("tenant_profiles")
          .select("id, full_name, email, status, connected_at")
          .eq("landlord_id", authData.user.id)
          .eq("property_id", found.property.id)
          .eq("unit_id", found.unit.id)
          .eq("status", "active")
          .order("connected_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("occupancy_history")
          .select("id, tenant_profile_id, tenant_name, tenant_email, property_name, unit_name, moved_in_at, moved_out_at")
          .eq("landlord_id", authData.user.id)
          .eq("property_id", found.property.id)
          .eq("unit_id", found.unit.id)
          .order("moved_in_at", { ascending: false }),
      ]);

      if (!active) return;
      if (assignmentError) setError(assignmentError.message);
      if (historyError && historyError.code !== "42P01") setError(historyError.message);
      setData({ ...found, assignment: assignment || null, history: history || [] });
    }

    load();
    return () => { active = false; };
  }, [id, router]);

  if (data === undefined) return <main className="dashboard-loading"><p>Loading unit...</p></main>;
  if (!data) return <main className="properties-shell"><section className="properties-empty"><h2>Unit not found</h2><Link className="button" href="/units">Back to Units</Link></section></main>;

  const { unit, property, assignment, history } = data;
  const openHistory = history.find((record) => !record.moved_out_at);
  const occupied = Boolean(assignment || openHistory) || unit.status === "occupied";
  const tenantName = assignment?.full_name || openHistory?.tenant_name || unit.tenantName || "Tenant connected";
  const tenantEmail = assignment?.email || openHistory?.tenant_email || unit.tenantEmail || "—";

  return <main className="properties-shell">
    <header className="properties-topbar">
      <div><Link className="back-link" href="/units">← Units</Link><span className="auth-kicker">{property.name}</span><h1>{unit.name}</h1><p>{property.address}, {property.city}, {property.state} {property.zip}</p></div>
      <div className="unit-detail-actions"><span className={`unit-detail-status ${occupied ? "occupied" : "vacant"}`}>{occupied ? "occupied" : "vacant"}</span><Link className="button" href={`/invitations?unit=${unit.id}`}>Generate tenant QR</Link></div>
    </header>

    <section className="unit-detail-grid"><article><small>Monthly rent</small><strong>${Number(unit.rent || 0).toLocaleString()}</strong></article><article><small>Bedrooms</small><strong>{unit.bedrooms}</strong></article><article><small>Bathrooms</small><strong>{unit.bathrooms}</strong></article><article><small>Backup unit code</small><strong className="detail-unit-code">{unit.unitCode ? formatUnitCode(unit.unitCode) : "Not generated"}</strong></article></section>

    <section className="dashboard-card unit-detail-card"><h2>Current occupancy</h2><div className="unit-detail-row"><div><small>Current tenant</small><strong>{occupied ? tenantName : "Vacant"}</strong></div><div><small>Email</small><strong>{occupied ? tenantEmail : "—"}</strong></div></div>{unit.notes && <><h2>Notes</h2><p>{unit.notes}</p></>}</section>

    <section className="dashboard-card occupancy-history-card">
      <div className="card-heading"><div><h2>Occupancy history</h2><p>A permanent record of everyone assigned to this unit.</p></div><span className="history-count">{history.length} {history.length === 1 ? "record" : "records"}</span></div>
      {history.length ? <div className="occupancy-timeline">{history.map((record) => <article key={record.id} className={!record.moved_out_at ? "current" : ""}>
        <span className="timeline-dot" />
        <div><div className="history-row-heading"><strong>{record.tenant_name || record.tenant_email || "Tenant"}</strong>{!record.moved_out_at && <em>Current</em>}</div><p>{formatDate(record.moved_in_at)} – {formatDate(record.moved_out_at)}</p><small>{record.tenant_email || "No email recorded"}</small></div>
      </article>)}</div> : <div className="inline-empty occupancy-empty"><div><strong>No occupancy history yet</strong><p>The first record will be created automatically when a tenant connects to this unit.</p></div></div>}
      {error && <p className="form-message error-message">{error}</p>}
    </section>
  </main>;
}
