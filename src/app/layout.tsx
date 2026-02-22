import type { Metadata, Viewport } from "next";
import { inter, outfit } from "@/lib/fonts";
import "./globals.css";
import Providers from "@/components/providers/query-provider";
import { Toaster } from "sonner";


export const metadata: Metadata = {
  title: "Ting - Group Expense Manager",
  description: "Easily manage group expenses and settlements.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ting",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" richColors />
      </body>

    </html>
  );
}

