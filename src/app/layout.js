import "./globals.css";

export const metadata = {
  title: "TamLynk",
  description:
    "Modern property management software connecting tenants and property managers.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
