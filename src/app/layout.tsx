import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond, Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Luxe - Premium Jewelry & Dresses",
    template: "%s | Luxe",
  },
  description: "Shop premium quality jewelry and dresses at affordable prices. Fast delivery across India with COD available.",
  keywords: ["jewelry", "dresses", "online shopping", "India", "fashion", "accessories"],
  authors: [{ name: "Luxe" }],
  openGraph: {
    title: "Luxe - Premium Jewelry & Dresses",
    description: "Shop premium quality jewelry and dresses at affordable prices.",
    type: "website",
    locale: "en_IN",
    siteName: "Luxe",
  },
  twitter: {
    card: "summary_large_image",
    title: "Luxe - Premium Jewelry & Dresses",
    description: "Shop premium quality jewelry and dresses at affordable prices.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Razorpay */}
        <link rel="preconnect" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${inter.variable} antialiased`}
      >
        {children}
        <Toaster richColors position="top-center" />
        
        {/* Razorpay Checkout Script */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
