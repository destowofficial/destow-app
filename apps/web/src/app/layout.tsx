import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Destow — Intercity travel, without the hassle",
  description:
    "Destow is building India's next-generation intercity cab and bus booking platform. Launching soon — join early access.",
  metadataBase: new URL("https://destow.in"),
  openGraph: {
    title: "Destow — Intercity travel, without the hassle",
    description:
      "India's next-generation intercity cab and bus booking platform. Launching soon.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
