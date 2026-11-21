import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SyncWatch – Watch Together, In Sync",
    template: "%s | SyncWatch",
  },
  description:
    "SyncWatch lets you watch YouTube and HTML5 videos in perfect sync with friends. Create a room, invite your crew, and enjoy together.",
  keywords: ["watch party", "sync video", "watch together", "youtube party"],
  authors: [{ name: "SyncWatch" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: "SyncWatch – Watch Together, In Sync",
    description: "Watch videos in perfect sync with your friends.",
    siteName: "SyncWatch",
  },
  twitter: {
    card: "summary_large_image",
    title: "SyncWatch – Watch Together, In Sync",
    description: "Watch videos in perfect sync with your friends.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
