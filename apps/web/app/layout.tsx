import "./globals.css";
import type { Metadata } from "next";
import { Lato, Playfair_Display } from "next/font/google";
import { ViewportHeightSync } from "../components/viewport-height-sync";

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Estúdio Corpo & Alma",
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
        className={`${lato.variable} ${playfair.variable} font-sans min-h-screen bg-studio-bg text-studio-text`}
      >
        <ViewportHeightSync />
        {children}
      </body>
    </html>
  );
}
