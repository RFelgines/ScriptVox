import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import PersistentPlayer from "@/components/PersistentPlayer";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ScriptVox - AI Audiobook Generator",
  description: "Transform your EPUBs into immersive audiobooks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#0d0d1a] text-white`}>
        <AudioPlayerProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-[#0d0d1a] pb-24">
              {children}
            </main>
          </div>
          <PersistentPlayer />
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
