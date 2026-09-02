import type { Metadata, Viewport } from "next";
import { AppStoreProvider } from "@/lib/store/AppStore";
import { ActiveSectionProvider } from "@/lib/store/useActiveSection";
import { ThemeProvider } from "@/lib/store/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORTIA HUB | Formation, Boutique Digitale & Services Experts",
  description:
    "FORTIA HUB est la plateforme de référence pour l'apprentissage et les services professionnels d'élite. Formations certifiantes, boutique numérique, marketplace freelance et services d'agence.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/pwa-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/pwa-512x512.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    title: "FORTIA HUB | LEARN. BUILD. SUCCEED.",
    description:
      "Formations certifiantes en Crypto, IA, Canva, CapCut, Marketing Digital & Entrepreneuriat. Boutique numérique et prestations de services sur-mesure.",
    type: "website",
    siteName: "FORTIA HUB",
  },
};

export const viewport: Viewport = {
  themeColor: "#021231",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#021231] dark font-sans antialiased text-slate-100">
        <ThemeProvider>
          <AppStoreProvider>
            <ActiveSectionProvider>{children}</ActiveSectionProvider>
          </AppStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}