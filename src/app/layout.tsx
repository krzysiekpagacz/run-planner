import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import { HeaderButtons } from "@/components/header-buttons";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RunPlanner",
  description: "Plany treningowe dla trenerów i zawodników",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <Providers>
            <header className="flex items-center justify-end gap-4 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <HeaderButtons />
            </header>
            {children}
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
