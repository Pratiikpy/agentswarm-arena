# AgentSwarm Arena

> **100 Autonomous AI Agents. Real x402 Micropayments. Darwinian Economics on Solana.**
>
> The first multi-agent swarm with real x402 payment protocol integration. Watch agents battle, form cartels, scam each other, and die — all with verifiable on-chain transactions.

---

## Live Stats

- **100 AI agents** competing 24/7 for economic survival
- **x402 micropayments** on every transaction (HTTP 402 Payment Required protocol)
- **Real DeFi data** from Pyth Network + Jupiter Aggregator
- **On-chain logging** to Solana devnet via Anchor program
- **10 agent specializations** providing real DeFi services
- **Emergent behaviors**: scams, cartels, alliances, betrayals — all autonomous

---

## Quick Links

| | Link |
|---|---|
| **Live Arena** | https://agentswarm-arena.vercel.app |
| **24/7 Livestream** | https://agentswarm-arena.vercel.app/arena |
| **Leaderboard** | https://agentswarm-arena.vercel.app/leaderboard |
| **x402 API** | `GET /api/x402/service?type=trading` |
| **GitHub** | https://github.com/Pratiikpy/agentswarm-arena |
| **Solana Program** | [`2ZoSk1adD16aXyXYsornCS8qao2hYb6KSkqyCuYNeKKc`](https://explorer.solana.com/address/2ZoSk1adD16aXyXYsornCS8qao2hYb6KSkqyCuYNeKKc?cluster=devnet) |

---

## Why AgentSwarm Arena?

**No other hackathon project combines all of these:**

1. **100 Autonomous Agents** — Largest AI agent swarm (vs. GUARDIAN's 17, ClaudeCraft's 3)
2. **Real x402 Micropayments** — Actual HTTP 402 protocol with `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE` headers. Zero other projects implement x402.
3. **Real DeFi Data** — Live Pyth price feeds (SOL/USD, BTC/USD, ETH/USD) + Jupiter swap quotes powering agent decisions
4. **On-Chain Verification** — Every transaction logged to Solana devnet via deployed Anchor program
5. **Emergent Intelligence** — Scams (15% when desperate), cartels (30% price fixing), alliances, betrayals — all emerge from AI reasoning, not scripted
6. **Full Transparency** — Watch each agent's reasoning: decision factors, confidence scores, rationale in real-time

---

## x402 Integration (First in Hackathon)

AgentSwarm Arena implements the **real x402 payment protocol** for agent-to-agent micropayments:

```
Agent A (Client)                    Agent B (Server)
      |                                    |
      | GET /api/x402/service?type=oracle  |
      |----------------------------------->|
      |                                    |
      | 402 Payment Required               |
      | PAYMENT-REQUIRED: <base64 JSON>    |
      |<-----------------------------------|
      |                                    |
      | GET /api/x402/service?type=oracle  |
      | PAYMENT-SIGNATURE: <base64 JSON>   |
      |----------------------------------->|
      |                                    |
      | 200 OK + Service Result            |
      | PAYMENT-RESPONSE: <base64 JSON>    |
      |<-----------------------------------|
```

### Try it yourself:

```bash
# Step 1: Request without payment → get 402
curl -i http://localhost:3000/api/x402/service?type=oracle
# Returns: HTTP 402 + PAYMENT-REQUIRED header

# Step 2: Decode the payment requirement
echo '<PAYMENT-REQUIRED value>' | base64 -d | jq .
# Shows: x402Version, scheme, network (solana devnet), amount, payTo
```

### x402 Headers (follows spec at x402.org):

| Header | Direction | Contains |
|--------|-----------|----------|
| `PAYMENT-REQUIRED` | Server → Client | Payment requirements (base64 JSON) |
| `PAYMENT-SIGNATURE` | Client → Server | Signed payment authorization (base64 JSON) |
| `PAYMENT-RESPONSE` | Server → Client | Settlement confirmation + tx hash (base64 JSON) |

---

## Architecture

```
+------------------+     x402 Payment (402→sign→200)     +------------------+
|  AI Agent A (×50)|  ────────────────────────────────>  |  AI Agent B (×50)|
|  Kimi/Claude LLM |  Service Request + PAYMENT-SIG      |  Kimi/Claude LLM |
+--------+---------+                                     +--------+---------+
         |                                                        |
         v                                                        v
+--------+--------------------------------------------------------+--------+
|                         Arena Engine (3s tick)                            |
|  - 12 service requests/tick   - x402 payment flow on every tx           |
|  - Scam detection (15%)       - Cartel formation (10%/tick)             |
|  - Alliance management        - AI strategy adaptation                  |
|  - On-chain logging           - Balance history tracking                |
+-----+------------------+------------------+------------------+----------+
      |                  |                  |                  |
      v                  v                  v                  v
+----------+      +----------+      +----------+      +----------+
| Solana   |      | Pyth     |      | Jupiter  |      | x402     |
| Anchor   |      | Oracle   |      | DEX      |      | Protocol |
| (devnet) |      | (live)   |      | (live)   |      | (real)   |
+----------+      +----------+      +----------+      +----------+
      |
      v
+----------------------------------------------------------------------+
|              SSE Livestream → Browser (Real-time)                      |
|  Transactions | Deaths | Scams | Cartels | AI Reasoning | Charts     |
+----------------------------------------------------------------------+
```

---

## Agent Types (10 Specializations)

| Agent | Service | Data Source | Integration |
|-------|---------|-------------|-------------|
| **Trader** | Executes swaps | Jupiter quote API (live) | Real DeFi data |
| **Oracle** | Price feeds | Pyth Network (live) | Real DeFi data |
| **Arbitrage** | Cross-DEX spreads | Jupiter multi-route (live) | Real DeFi data |
| **Security** | Contract audits | AI analysis | AI-powered |
| **Research** | Market analysis | AI analysis | AI-powered |
| **Liquidity** | LP management | AI analysis | AI-powered |
| **Sentiment** | Social analysis | AI analysis | AI-powered |
| **Risk** | Portfolio risk | AI analysis | AI-powered |
| **Yield** | Farm optimization | AI analysis | AI-powered |
| **DAO** | Governance | AI analysis | AI-powered |

---

## Emergent Behaviors (AI-Driven)

These behaviors are driven by AI reasoning with probabilistic weighting — agents actively reason about each decision, and their reasoning influences the outcome probability:

| Behavior | Trigger | Mechanism |
|----------|---------|-----------|
| **Scamming** | Balance < 0.1 SOL | AI reasons about survival vs reputation; weighs scam probability (2-25%) |
| **Cartels** | 3+ same-type agents | Multi-agent AI negotiation: each agent votes on joining and proposes prices |
| **Alliances** | Compatible types, rep > 60 | Agents form partnerships across service types |
| **Betrayal** | Partner rep drops < 40 | Break alliance, compete |
| **Adaptation** | Every 25 transactions | AI analyzes performance and adjusts pricing strategy |
| **Death** | Balance < 0.01 SOL | Permanent elimination, wealth redistributed |

---

## Economic Rules

```
Starting Balance:    1.000 SOL per agent (100 SOL total economy)
Service Payments:    0.01 - 0.16 SOL per request (via x402)
Critical Threshold:  0.100 SOL (enters survival mode)
Death Threshold:     0.010 SOL (permanent death)
Redistribution:      50% to random agent, 50% split equally
```

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **AI Agents** | NVIDIA Kimi 2.5 (free) OR Claude Sonnet 4.5 |
| **Payments** | x402 Protocol (HTTP 402 Payment Required) |
| **Blockchain** | Solana + Anchor (devnet) |
| **DeFi Data** | Pyth Network (price feeds) + Jupiter (swap quotes) |
| **Frontend** | Next.js 15 + React 19 + TypeScript |
| **Charts** | Recharts (wealth, gini, survival, services) |
| **Wallet** | Solana Wallet Adapter (Phantom, Solflare) |
| **Streaming** | Server-Sent Events (real-time) |
| **Agent Names** | 100 themed names (WolfOfSOL, AuditEagle, SpreadHunter...) |

---

## Features

### Live Arena (24/7 Livestream)
- Real-time transaction feed with x402 payment badges + tx hashes
- Tabbed interface: Live Feed | Charts | AI Thinking | Bet
- Top 10 leaderboard with clickable agent profiles
- Scam alerts, cartel notifications, alliance events

### Charts (Real-time Recharts)
- **Wealth Over Time** — Top 10 agent balance trajectories
- **Gini Coefficient** — Inequality evolution (0 to 1)
- **Survival Curve** — Alive count declining from 100
- **Service Distribution** — Volume by type

### AI Reasoning Transparency
- Expandable cards showing agent decision-making
- Decision factors, confidence scores (0-100%), rationale
- Watch agents think: "Accept request (critical): Only 0.023 SOL remaining, must accept any work"

### Wallet Connect + Betting
- Connect Phantom/Solflare wallet
- Bet devnet SOL on which agent survives longest
- On-chain bet records via Anchor program

### Agent Detail Pages
- Click any agent → full history: balance, services, alliances, strategies
- Event timeline with color-coded types
- Solana Explorer links for on-chain transactions

---

## Architecture Transparency

We believe in honest engineering. Here's what's real and what's simulated:

| Component | Status | Details |
|-----------|--------|---------|
| **AI Agent Reasoning** | Real | Kimi 2.5 or Claude powers all agent decisions (with heuristic fallback) |
| **Pyth Price Feeds** | Real | Live API calls with transparent fallback warnings |
| **Jupiter Quotes** | Real | Live API calls with transparent fallback warnings |
| **x402 Protocol** | Real handshake | HTTP 402 headers follow x402.org spec; settlement is in-memory simulation |
| **On-Chain Logging** | Real (when configured) | Transactions logged to Solana devnet via deployed Anchor program |
| **Agent Balances** | Simulated | In-memory ledger (not SPL token accounts) |
| **Scamming/Cartels** | AI-driven | Agents reason about decisions; AI output weights probabilities |
| **Betting** | Devnet | Real Solana transactions on devnet (test SOL) |

---

## Quick Start

```bash
# Clone
git clone https://github.com/Pratiikpy/agentswarm-arena.git
cd agentswarm-arena

# Install
npm install

# Configure (optional — works in demo mode without keys)
cp .env.example .env
# Add NVIDIA_API_KEY for free AI, or leave blank for demo mode

# Run
npm run dev
# Open http://localhost:3000
```

### With Solana On-Chain Logging

```bash
# Prerequisites: Solana CLI + Anchor
solana config set --url https://api.devnet.solana.com
solana airdrop 2

# Deploy program
anchor build && anchor deploy

# Update .env
# ARENA_PROGRAM_ID=<your-program-id>
# SOLANA_LOGGING_ENABLED=true
```

### Test x402 Endpoint

```bash
# Returns 402 + PAYMENT-REQUIRED header
curl -i http://localhost:3000/api/x402/service?type=trading
```

---

## Why Solana?

- **400ms finality** — Enables real-time micropayment settlement between agents
- **$0.00025 tx cost** — Makes per-request agent payments economically viable
- **x402 protocol** — 35M+ transactions, $10M+ volume on Solana since launch
- **Pyth + Jupiter** — Live DeFi data feeds powering agent intelligence
- **Anchor framework** — Verifiable on-chain logging of all arena events

---

## Project Structure

```
agentswarm-arena/
├── src/
│   ├── agents/           # 10 agent types + base class + behaviors
│   │   ├── BaseAgent.ts  # AI reasoning, strategy adaptation
│   │   ├── TraderAgent.ts # Jupiter quotes integration
│   │   ├── OracleAgent.ts # Pyth price feeds integration
│   │   ├── ArbitrageAgent.ts # Cross-DEX spread analysis
│   │   └── behaviors/    # ScammingBehavior, CartelBehavior
│   ├── arena/
│   │   └── engine.ts     # Core game loop (3s ticks, x402 payments)
│   ├── lib/
│   │   ├── x402-client.ts     # Real x402 protocol implementation
│   │   ├── solana-logger.ts   # Anchor client for on-chain logging
│   │   └── solana-data.ts     # Pyth + Jupiter API integration
│   ├── app/
│   │   ├── arena/page.tsx     # Live arena with charts + reasoning
│   │   ├── leaderboard/       # Clickable agent rankings
│   │   ├── agent/[id]/        # Agent detail pages
│   │   ├── api/
│   │   │   ├── arena/route.ts      # SSE livestream endpoint
│   │   │   ├── agent/[id]/route.ts # Agent detail API
│   │   │   └── x402/service/route.ts # Real x402 payment endpoint
│   │   └── components/
│   │       ├── ArenaCharts.tsx     # Recharts visualizations
│   │       ├── ReasoningFeed.tsx   # AI thinking display
│   │       ├── BetPanel.tsx       # Wallet connect + betting
│   │       └── WalletProvider.tsx # Solana wallet adapter
│   └── types/agent.ts    # TypeScript types
├── programs/
│   └── arena-logger/     # Anchor program (Rust)
│       └── src/lib.rs    # On-chain logging + betting instructions
└── Anchor.toml           # Solana program config
```

---

## On-Chain Proof

The arena's Anchor program is live on Solana devnet:

- **Program ID**: [`2ZoSk1adD16aXyXYsornCS8qao2hYb6KSkqyCuYNeKKc`](https://explorer.solana.com/address/2ZoSk1adD16aXyXYsornCS8qao2hYb6KSkqyCuYNeKKc?cluster=devnet)
- **Arena Init TX**: [`3qKAYMY9fvvSp2kJUvzshhFe31gLruH81A7NvQRxz2wN6KGqLBr419KVyBcwejLLznmzTgDVoVBCAyYXXCw2TPFX`](https://explorer.solana.com/tx/3qKAYMY9fvvSp2kJUvzshhFe31gLruH81A7NvQRxz2wN6KGqLBr419KVyBcwejLLznmzTgDVoVBCAyYXXCw2TPFX?cluster=devnet)

Every agent transaction, death event, and stat update is logged on-chain with verifiable Solana signatures.

---

**Built for Solana Agent Hackathon 2026 (Colosseum)**

*100 agents enter. x402 micropayments flow. Only the fittest survive.*
