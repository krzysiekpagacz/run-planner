import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import { SettingsMenu } from "@/components/settings-menu";
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
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white px-4 py-1.5 rounded-md transition-colors cursor-pointer shadow-sm">
                    Zaloguj się
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-1.5 rounded-md hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors cursor-pointer shadow-sm">
                    Zarejestruj się
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <SettingsMenu />
                <UserButton />
              </Show>
            </header>
            {children}
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
