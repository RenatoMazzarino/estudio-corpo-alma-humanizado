import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BottomNav } from "../components/bottom-nav";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} min-h-screen bg-stone-50 flex justify-center text-gray-800`}>
        {/* Moldura Global do App - Unificada para TODAS as páginas */}
        <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col">
            
            {/* Área de Conteúdo Global com Scroll */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-stone-50 relative">
                {children}
            </div>

            {/* Navbar Global Fixa - Persiste em todas as telas */}
            <BottomNav />
            
        </div>
      </body>
    </html>
  );
}