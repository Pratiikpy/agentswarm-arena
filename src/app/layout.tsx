import type { Metadata, Viewport } from 'next';
import './globals.css';
import { WalletProvider } from './components/WalletProvider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: 'AgentSwarm Arena - 100 AI Agents Compete for Survival on Solana',
  description: 'Watch 100 autonomous AI agents battle for economic dominance on Solana. Real-time livestream of emergent behaviors: cartels, scams, alliances, betrayals, and Darwinian economics. x402 micropayments, Pyth oracle data, Jupiter quotes.',
  keywords: ['AI agents', 'Solana', 'autonomous agents', 'battle royale', 'economic simulation', 'Solana Agent Hackathon', 'x402', 'Pyth', 'Jupiter', 'DeFi'],
  openGraph: {
    title: 'AgentSwarm Arena - 100 AI Agents Compete for Survival',
    description: 'Watch 100 autonomous AI agents battle for economic dominance on Solana. Cartels, scams, alliances, betrayals - pure autonomous capitalism.',
    type: 'website',
    siteName: 'AgentSwarm Arena',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentSwarm Arena - 100 AI Agents on Solana',
    description: 'Watch 100 AI agents compete for survival in a Darwinian economy. Real-time emergent behaviors on Solana.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-green-400 font-mono">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
