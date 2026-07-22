import Link from "next/link";

export default function AuthShell({ eyebrow, title, description, children, footer }) {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link className="brand auth-brand" href="/" aria-label="TamLynk home">
          <img src="/tamlynk-logo.png" alt="" />
          <span>TamLynk</span>
        </Link>
        <div className="auth-brand-copy">
          <span className="eyebrow">Property management, connected</span>
          <h1>Tenant and Management — <span>TamLynked Together.</span></h1>
          <p>Keep properties, tenants, leases, rent, maintenance, and documents connected in one organized workspace.</p>
        </div>
        <div className="auth-proof-grid">
          <div><strong>5</strong><span>properties included free</span></div>
          <div><strong>1</strong><span>place for rental operations</span></div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <Link className="auth-mobile-brand" href="/">
            <img src="/tamlynk-logo.png" alt="" /> TamLynk
          </Link>
          <span className="auth-kicker">{eyebrow}</span>
          <h2>{title}</h2>
          <p className="auth-description">{description}</p>
          {children}
          {footer && <div className="auth-footer-copy">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
