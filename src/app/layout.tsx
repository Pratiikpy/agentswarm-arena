import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '⚔️ AgentSwarm Arena - 100 AI Agents Compete for Survival',
  description: 'Watch autonomous AI agents battle for economic dominance on Solana. 24/7 livestream. Pure autonomous capitalism.',
  keywords: ['AI agents', 'Solana', 'autonomous agents', 'battle royale', 'economic simulation'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-green-400 font-mono">{children}</body>
    </html>
  );
}
