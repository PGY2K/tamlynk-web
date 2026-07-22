const features = [
  {
    icon: "⌂",
    title: "Property Management",
    description: "Keep properties, units, occupancy, and important details organized in one place.",
  },
  {
    icon: "◎",
    title: "Tenant Management",
    description: "Manage tenant profiles, contact information, lease details, and account history.",
  },
  {
    icon: "▤",
    title: "Lease Tracking",
    description: "Track active leases, renewal dates, rent terms, and essential documents.",
  },
  {
    icon: "$",
    title: "Rent Tracking",
    description: "See balances, payment status, due dates, and transaction history at a glance.",
  },
  {
    icon: "◇",
    title: "Maintenance Requests",
    description: "Let tenants report issues while managers organize updates and next steps.",
  },
  {
    icon: "□",
    title: "Secure Documents",
    description: "Keep leases, notices, inspections, and property files easy to find.",
  },
];

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
    <path d="m5 10 3.1 3.1L15.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <div className="container nav-wrap">
          <a className="brand" href="#top" aria-label="TamLynk home">
            <img src="/tamlynk-logo.png" alt="" />
            <span>TamLynk</span>
          </a>

          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
          </nav>

          <div className="nav-actions">
            <a className="text-button" href="#signin">Sign In</a>
            <a className="button button-small" href="#signup">Sign Up</a>
          </div>

          <details className="mobile-menu">
            <summary aria-label="Open navigation menu">
              <span></span><span></span><span></span>
            </summary>
            <div className="mobile-menu-panel">
              <a href="#features">Features</a>
              <a href="#solutions">Solutions</a>
              <a href="#pricing">Pricing</a>
              <a href="#signin">Sign In</a>
              <a className="button" href="#signup">Sign Up</a>
            </div>
          </details>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="container hero-grid">
          <div className="hero-content">
            <span className="eyebrow">A better way to manage rentals</span>
            <h1>Tenant and Management — <span>TamLynked Together.</span></h1>
            <p>
              Manage properties, tenants, leases, rent, maintenance, and documents from one modern platform built for both sides of the rental experience.
            </p>
            <div className="hero-actions">
              <a className="button" href="#signup">Get Started Free</a>
              <a className="button button-secondary" href="#features">Explore Features</a>
            </div>
            <div className="hero-note">
              <div className="avatar-stack" aria-hidden="true">
                <span>PM</span><span>LT</span><span>TN</span>
              </div>
              <p><strong>Simple from day one.</strong> Start with up to 5 properties free.</p>
            </div>
          </div>

          <div className="dashboard-preview" aria-label="TamLynk dashboard preview">
            <div className="preview-topbar">
              <div className="preview-brand">
                <img src="/tamlynk-logo.png" alt="" />
                <span>TamLynk</span>
              </div>
              <span className="preview-user">JD</span>
            </div>
            <div className="preview-body">
              <aside className="preview-sidebar">
                <span className="active">Overview</span>
                <span>Properties</span>
                <span>Tenants</span>
                <span>Payments</span>
                <span>Maintenance</span>
              </aside>
              <div className="preview-main">
                <div className="preview-heading">
                  <div><small>Welcome back</small><strong>Portfolio overview</strong></div>
                  <button>+ Add property</button>
                </div>
                <div className="stat-grid">
                  <article><small>Properties</small><strong>12</strong><span>8 occupied</span></article>
                  <article><small>Rent collected</small><strong>$18,420</strong><span className="positive">+8.4% this month</span></article>
                  <article><small>Open requests</small><strong>4</strong><span>2 need attention</span></article>
                </div>
                <div className="preview-panels">
                  <article className="rent-panel">
                    <div className="panel-title"><strong>Rent overview</strong><span>July</span></div>
                    <div className="chart" aria-hidden="true">
                      <span style={{height:"34%"}}></span><span style={{height:"50%"}}></span><span style={{height:"44%"}}></span><span style={{height:"69%"}}></span><span style={{height:"59%"}}></span><span style={{height:"86%"}}></span><span style={{height:"76%"}}></span>
                    </div>
                    <div className="chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
                  </article>
                  <article className="activity-panel">
                    <div className="panel-title"><strong>Recent activity</strong><span>View all</span></div>
                    <div className="activity"><i>$</i><p><strong>Rent payment received</strong><span>Unit 2B · $1,450</span></p></div>
                    <div className="activity"><i>◇</i><p><strong>New maintenance request</strong><span>Unit 4A · Plumbing</span></p></div>
                    <div className="activity"><i>▤</i><p><strong>Lease signed</strong><span>Unit 1C · 12 months</span></p></div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-glow hero-glow-one"></div>
        <div className="hero-glow hero-glow-two"></div>
      </section>

      <section className="section trust-strip" aria-label="Product benefits">
        <div className="container trust-grid">
          <span>Built for landlords</span><span>Designed for tenants</span><span>Everything in one place</span><span>Simple, secure, connected</span>
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <div className="section-heading centered">
            <span className="eyebrow">Everything connected</span>
            <h2>One platform for the work that keeps rentals moving.</h2>
            <p>Replace scattered messages, spreadsheets, and paperwork with one organized property management hub.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className="feature-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <a href="#signup">Learn more <span>→</span></a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section solutions-section" id="solutions">
        <div className="container">
          <div className="section-heading centered">
            <span className="eyebrow">Two sides. One connection.</span>
            <h2>Better for managers. Easier for tenants.</h2>
          </div>
          <div className="solutions-grid">
            <article className="solution-card landlord-card">
              <div className="solution-badge">For landlords &amp; managers</div>
              <h3>Stay in control without chasing every detail.</h3>
              <p>See what needs attention, keep information organized, and manage your portfolio with less manual work.</p>
              <ul>
                <li><CheckIcon />Manage properties and units</li>
                <li><CheckIcon />Track tenants, leases, and balances</li>
                <li><CheckIcon />Organize maintenance and documents</li>
                <li><CheckIcon />See portfolio activity in one dashboard</li>
              </ul>
              <a className="inline-link" href="#signup">Start managing smarter →</a>
            </article>
            <article className="solution-card tenant-card">
              <div className="solution-badge">For tenants</div>
              <h3>Everything about your rental, easy to access.</h3>
              <p>Give tenants a simple place to handle payments, requests, documents, and communication.</p>
              <ul>
                <li><CheckIcon />View rent and payment history</li>
                <li><CheckIcon />Submit maintenance requests</li>
                <li><CheckIcon />Access lease documents</li>
                <li><CheckIcon />Stay connected with management</li>
              </ul>
              <a className="inline-link" href="#signup">See the tenant experience →</a>
            </article>
          </div>
        </div>
      </section>

      <section className="section pricing-section" id="pricing">
        <div className="container">
          <div className="section-heading centered">
            <span className="eyebrow">Simple pricing</span>
            <h2>Start free. Grow when your portfolio does.</h2>
            <p>Choose the plan that fits the number of properties you manage.</p>
          </div>
          <div className="pricing-grid">
            <article className="price-card">
              <div><span className="plan-name">Free</span><p>Perfect for getting started.</p></div>
              <div className="price"><strong>$0</strong><span>/month</span></div>
              <div className="property-limit">Up to <strong>5 properties</strong></div>
              <ul>
                <li><CheckIcon />Property management</li>
                <li><CheckIcon />Tenant profiles</li>
                <li><CheckIcon />Lease tracking</li>
                <li><CheckIcon />Basic dashboard</li>
              </ul>
              <a className="button button-secondary full-button" href="#signup">Get Started</a>
            </article>

            <article className="price-card featured-price">
              <div className="popular-tag">Most Popular</div>
              <div><span className="plan-name">Pro</span><p>For growing rental portfolios.</p></div>
              <div className="price"><strong>Coming soon</strong></div>
              <div className="property-limit">Up to <strong>25 properties</strong></div>
              <ul>
                <li><CheckIcon />Everything in Free</li>
                <li><CheckIcon />Rent tracking</li>
                <li><CheckIcon />Maintenance requests</li>
                <li><CheckIcon />Secure documents</li>
              </ul>
              <a className="button full-button" href="#signup">Join the Waitlist</a>
            </article>

            <article className="price-card">
              <div><span className="plan-name">Enterprise</span><p>For larger teams and portfolios.</p></div>
              <div className="price"><strong>Custom</strong></div>
              <div className="property-limit"><strong>25+ properties</strong></div>
              <ul>
                <li><CheckIcon />Everything in Pro</li>
                <li><CheckIcon />Flexible property limits</li>
                <li><CheckIcon />Multi-user access</li>
                <li><CheckIcon />Priority support</li>
              </ul>
              <a className="button button-secondary full-button" href="mailto:hello@tamlynk.com">Contact Us</a>
            </article>
          </div>
        </div>
      </section>

      <section className="section cta-section" id="signup">
        <div className="container cta-card">
          <div>
            <span className="eyebrow">Get TamLynked</span>
            <h2>Bring your rentals together in one place.</h2>
            <p>TamLynk is currently being built. Join early and be among the first to know when accounts open.</p>
          </div>
          <div className="cta-actions">
            <a className="button button-light" href="mailto:hello@tamlynk.com?subject=TamLynk%20Early%20Access">Request Early Access</a>
            <a className="cta-signin" id="signin" href="mailto:hello@tamlynk.com?subject=TamLynk%20Sign%20In%20Question">Already interested? Contact us →</a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <a className="brand" href="#top">
              <img src="/tamlynk-logo.png" alt="" />
              <span>TamLynk</span>
            </a>
            <p>Tenant and Management — TamLynked Together.</p>
          </div>
          <div className="footer-links"><strong>Product</strong><a href="#features">Features</a><a href="#solutions">Solutions</a><a href="#pricing">Pricing</a></div>
          <div className="footer-links"><strong>Company</strong><a href="mailto:hello@tamlynk.com">Contact</a><a href="#top">About</a><a href="#signup">Early Access</a></div>
          <div className="footer-links"><strong>Legal</strong><a href="#">Privacy</a><a href="#">Terms</a><a href="mailto:hello@tamlynk.com">Support</a></div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 TamLynk. All rights reserved.</span>
          <span>Tenant + Management + Link</span>
        </div>
      </footer>
    </main>
  );
}
