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

const themeBootstrap = `(()=>{try{const key='playo-theme-mode';const saved=localStorage.getItem(key);const mode=saved==='light'||saved==='dark'||saved==='auto'?saved:'auto';const h=new Date().getHours();const theme=mode==='auto'?(h>=6&&h<18?'light':'dark'):mode;const root=document.documentElement;root.dataset.theme=theme;root.dataset.themeMode=mode;root.classList.toggle('dark',theme==='dark');root.style.colorScheme=theme}catch{}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:themeBootstrap}}/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
