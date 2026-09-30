import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Playo Venue Observatory",
  description: "Explore historical venue data, SQL analysis and honest model evaluation.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
