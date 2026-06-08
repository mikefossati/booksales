import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Autoriapp — Gestión de ventas para autores independientes",
  description: "Gestiona y analiza las ventas de tus libros en todos los canales. La app hecha para autores independientes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${cormorant.variable} h-full`}>
      <body className="min-h-full bg-[var(--color-bg)]">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
