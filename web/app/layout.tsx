import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Archivo } from "next/font/google";
import DynamicLogin from "@/components/DynamicLogin";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Chatter — See where the chatter is",
  description:
    "Social mindshare matched against on-chain market data. Pay $1. Act on the trend.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-paper text-ink">
        {/* Dynamic prize: Wallet Glow Up + Best Overall via email/social/wallet login with embedded wallets. */}
        <DynamicLogin>{children}</DynamicLogin>
      </body>
    </html>
  );
}
