import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Comentaram",
  description: "O que está explodindo agora — Esportes e Política.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Backdrop global (AGORA visível): fica acima do fundo e abaixo do app */}
        <div className="fixed inset-0 z-0 bg-black/40" aria-hidden="true" />

        {/* App sempre acima do backdrop */}
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
