export default function HomePage() {
  return (
    <main className="site-shell">
      <nav className="nav">
        <a className="brand" href="/" aria-label="TamLynk home">
          <span className="brand-mark">T</span>
          <span>TamLynk</span>
        </a>
        <span className="beta">Foundation v1</span>
      </nav>

      <section className="hero">
        <p className="eyebrow">TENANT + MANAGEMENT + LINK</p>
        <h1>Property management, connected.</h1>
        <p className="hero-copy">
          TamLynk is being built to give property managers and tenants one
          organized place for rent, maintenance, documents, and communication.
        </p>

        <div className="actions">
          <span className="primary-button">Coming soon</span>
          <span className="status">Website successfully deployed</span>
        </div>
      </section>

      <section className="feature-grid" aria-label="Planned features">
        <article className="feature-card">
          <span>01</span>
          <h2>Rent payments</h2>
          <p>Track balances, due dates, and payment history.</p>
        </article>
        <article className="feature-card">
          <span>02</span>
          <h2>Maintenance</h2>
          <p>Submit, organize, and follow repair requests.</p>
        </article>
        <article className="feature-card">
          <span>03</span>
          <h2>Documents</h2>
          <p>Keep leases and important property files together.</p>
        </article>
      </section>
    </main>
  );
}
