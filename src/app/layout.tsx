import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StopFive — Daily Appointment Platform",
  description: "StopFive is a Daily Appointment Platform designed to build behavioral anchors through a simple 10-second daily interaction.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

