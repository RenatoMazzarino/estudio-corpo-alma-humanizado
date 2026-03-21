import "./globals.css";
import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { ViewportHeightSync } from "../components/viewport-height-sync";
import { PRIMARY_STUDIO_TENANT_NAME } from "../src/modules/tenancy/defaults";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: PRIMARY_STUDIO_TENANT_NAME,
  description: "Sistema Administrativo Humanizado",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${cormorant.variable} font-sans min-h-screen bg-studio-bg text-studio-text`}
      >
        <ViewportHeightSync />
        {children}
      </body>
    </html>
  );
}
