"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatUnitCode } from "@/lib/unitCodes";

export default function UnitDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState();

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

      const { data: assignment } = await supabase
        .from("tenant_profiles")
        .select("full_name, email, status")
        .eq("landlord_id", authData.user.id)
        .eq("property_id", found.property.id)
        .eq("unit_id", found.unit.id)
        .eq("status", "active")
        .order("connected_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      setData({ ...found, assignment: assignment || null });
    }

    load();
    return () => { active = false; };
  }, [id, router]);

  if (data === undefined) return <main className="dashboard-loading"><p>Loading unit...</p></main>;
  if (!data) return <main className="properties-shell"><section className="properties-empty"><h2>Unit not found</h2><Link className="button" href="/units">Back to Units</Link></section></main>;

  const { unit, property, assignment } = data;
  const occupied = Boolean(assignment) || unit.status === "occupied";
  const tenantName = assignment?.full_name || unit.tenantName || "Tenant connected";
  const tenantEmail = assignment?.email || unit.tenantEmail || "—";

  return <main className="properties-shell">
    <header className="properties-topbar">
      <div><Link className="back-link" href="/units">← Units</Link><span className="auth-kicker">{property.name}</span><h1>{unit.name}</h1><p>{property.address}, {property.city}, {property.state} {property.zip}</p></div>
      <div className="unit-detail-actions"><span className={`unit-detail-status ${occupied ? "occupied" : "vacant"}`}>{occupied ? "occupied" : "vacant"}</span><Link className="button" href={`/invitations?unit=${unit.id}`}>Generate tenant QR</Link></div>
    </header>
    <section className="unit-detail-grid"><article><small>Monthly rent</small><strong>${Number(unit.rent || 0).toLocaleString()}</strong></article><article><small>Bedrooms</small><strong>{unit.bedrooms}</strong></article><article><small>Bathrooms</small><strong>{unit.bathrooms}</strong></article><article><small>Backup unit code</small><strong className="detail-unit-code">{unit.unitCode ? formatUnitCode(unit.unitCode) : "Not generated"}</strong></article></section>
    <section className="dashboard-card unit-detail-card"><h2>Occupancy</h2><div className="unit-detail-row"><div><small>Current tenant</small><strong>{occupied ? tenantName : "Vacant"}</strong></div><div><small>Email</small><strong>{occupied ? tenantEmail : "—"}</strong></div></div>{unit.notes && <><h2>Notes</h2><p>{unit.notes}</p></>}</section>
  </main>;
}
