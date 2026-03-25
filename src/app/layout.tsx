import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boudreaux's Inventory Management",
  description: "Track and manage all inventory for Boudreaux's Drug Store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
