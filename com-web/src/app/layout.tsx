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
        {/* Backdrop global padrão (mesma lógica do TopicModal: bg-black/40, mas mais leve) */}
        <div className="fixed inset-0 -z-10 bg-black/40" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
