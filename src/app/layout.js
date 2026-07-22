import "./globals.css";

export const metadata = {
  title: "TamLynk | Tenant and Management, TamLynked Together",
  description:
    "Manage properties, tenants, leases, rent, maintenance, and documents from one modern property management platform.",
  icons: {
    icon: "/tamlynk-logo.png",
    apple: "/tamlynk-logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
