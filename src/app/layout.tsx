import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WatchTV — Tracking de séries, filmes e animes",
  description:
    "Acompanhe episódios, calendário de estreias e seus filmes. Séries, animes e tudo do audiovisual num só lugar.",
  applicationName: "WatchTV",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WatchTV",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}