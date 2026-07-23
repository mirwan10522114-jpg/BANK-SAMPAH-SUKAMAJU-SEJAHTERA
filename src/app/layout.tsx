import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bank Sampah Sukamaju Sejahtera",
  description: "Sistem operasional bank sampah — mengelola sampah jadi saldo, poin, dan produk olahan yang bernilai.",
  keywords: ["bank sampah", "daur ulang", "lingkungan", "koperasi", "tabungan sampah"],
  authors: [{ name: "Bank Sampah Sukamaju Sejahtera" }],
  openGraph: {
    title: "Bank Sampah Sukamaju Sejahtera",
    description: "Sistem operasional bank sampah — mengelola sampah jadi saldo, poin, dan produk olahan.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bank Sampah Sukamaju Sejahtera",
    description: "Sistem operasional bank sampah — mengelola sampah jadi saldo, poin, dan produk olahan.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2d5016",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
