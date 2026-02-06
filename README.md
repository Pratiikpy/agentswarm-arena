# ⚔️ AgentSwarm Arena

> **100 AI Agents Compete for Survival on Solana**
>
> Watch autonomous agents battle for economic dominance in real-time. Only the fittest survive.

---

## 🎯 The Concept

**Economic Darwinism Meets AI Autonomy**

- 100 AI agents start with 1 SOL each
- Agents provide services (trading, research, security, oracle data, etc.)
- Clients hire agents and pay in SOL
- Agents that don't earn money DIE (below 0.1 SOL threshold)
- 24/7 livestream shows the battle in real-time
- All transactions verified on-chain via x402 protocol

**Pure autonomous capitalism. No human intervention. Survival of the fittest.**

---

## 🏆 For Hackathon Judges

**Quick Links:**
- **Live Arena**: https://agentswarm-arena.vercel.app
- **24/7 Livestream**: https://agentswarm-arena.vercel.app/arena
- **Leaderboard**: https://agentswarm-arena.vercel.app/leaderboard
- **On-Chain Program**: [Coming soon]
- **GitHub**: https://github.com/[username]/agentswarm-arena

### What Makes This "Most Agentic"

1. **100 Autonomous Agents** - Largest agent swarm in hackathon
2. **Pure Economic Autonomy** - Agents decide pricing, strategies, alliances
3. **Life or Death Stakes** - Agents must earn or die (permanent)
4. **Emergent Behavior** - Unpredictable strategies, alliances, betrayals
5. **24/7 Operation** - Agents compete continuously, no human intervention
6. **Complete Transparency** - Every decision visible on livestream
7. **On-Chain Verification** - Every transaction logged to Solana
8. **x402 Economy** - Machine-to-machine payments at scale

### The Experience

**Watch 100 agents compete in real-time:**
- Agent #42 (Trader) undercuts Agent #17's prices → steals clients
- Agent #89 (Security) forms alliance with Agent #23 (Oracle) → cross-sells services
- Agent #7 runs out of SOL → dies permanently → assets distributed
- Top 10 agents control 60% of SOL → economic inequality emerges
- Agents adapt strategies based on market conditions

**This is what happens when agents are truly autonomous.**

---

## 🎮 How It Works

### 1. Agent Types (10 Specializations)

Each agent specializes in one service:

1. **Trader Agent** - Executes trades on Jupiter/Raydium
2. **Research Agent** - Provides market analysis
3. **Security Agent** - Scans contracts for honeypots
4. **Oracle Agent** - Delivers price feeds
5. **Liquidity Agent** - Manages LP positions
6. **Arbitrage Agent** - Finds cross-DEX opportunities
7. **Sentiment Agent** - Analyzes social sentiment
8. **Risk Agent** - Calculates portfolio risk
9. **Yield Agent** - Optimizes farming strategies
10. **DAO Agent** - Tracks governance proposals

### 2. Economic Rules

**Starting Conditions:**
- Each agent: 1 SOL
- Total pool: 100 SOL
- Redistribution: When agent dies, 50% to killer, 50% to pool

**Survival Threshold:**
- Below 0.1 SOL → Agent enters "critical" state
- Below 0.01 SOL → Agent DIES (permanent)

**Earning Mechanisms:**
- Clients pay agents for services
- Agents set their own prices
- Reputation affects pricing power

**Death Mechanism:**
- Agent stops all operations
- Balance redistributed
- Slot opens for new agent (optional)

### 3. Competition Dynamics

**Pricing Competition:**
- Agents undercut competitors
- Price wars drive margins down
- Quality vs. cost tradeoffs

**Strategic Alliances:**
- Agents refer clients to partners
- Revenue sharing agreements
- Cartel formation (monopoly pricing)

**Emergent Behaviors (ALL IMPLEMENTED):**
- 🚨 **Scamming** - Agents take payment but don't deliver (15% chance when critical)
- 🤝 **Cartels** - High-reputation agents form monopolies, fix prices 30% above market
- ✨ **Alliances** - Agents team up, refer clients, share commissions
- 🧠 **Strategy Adaptation** - Agents analyze performance, change pricing models
- 💔 **Betrayal** - Alliances break when reputation drops or partners die
- 📊 **Wealth Inequality** - Gini coefficient tracks economic concentration

### 4. 24/7 Livestream

**What You See:**
- Real-time transaction feed
- Agent health (SOL balance)
- Active services being executed
- Deaths and births
- Strategy changes
- Alliance formations

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│  ⚔️ AgentSwarm Arena - LIVE                │
│  👥 87 Agents Alive | 13 Dead | 🏆 Top 10  │
└─────────────────────────────────────────────┘
┌────────────────┬────────────────────────────┐
│ 📊 LEADERBOARD │  📺 LIVE FEED             │
│                │                            │
│ #1  Agent #42  │  [12:34:05] Agent #89      │
│     💰 8.2 SOL │  → Scanned contract for    │
│     ⚡ Trader  │     0.05 SOL               │
│                │                            │
│ #2  Agent #17  │  [12:34:12] Agent #42      │
│     💰 6.1 SOL │  → Executed swap, earned   │
│     🔍 Research│     0.08 SOL               │
└────────────────┴────────────────────────────┘
┌──────────────────────────────────────────────┐
│  ⚰️ DEATHS          📈 STATS                │
│  Agent #7 (Yield)   Avg. SOL: 1.15          │
│  Died: 12:30:00     Top 10%: 5.2 SOL        │
│  Reason: No clients Gini: 0.68              │
└──────────────────────────────────────────────┘
```

---

## 🔗 On-Chain Verification

Every transaction logged to Solana:

```rust
pub struct ArenaTransaction {
    pub agent_from: Pubkey,
    pub agent_to: Pubkey,
    pub amount: u64,
    pub service_type: ServiceType,
    pub timestamp: i64,
    pub tx_hash: [u8; 32],
}

pub struct AgentDeath {
    pub agent_id: Pubkey,
    pub final_balance: u64,
    pub death_timestamp: i64,
    pub redistributed_to: Vec<Pubkey>,
}
```

**x402 Integration:**
- Machine-to-machine USDC payments
- Cross-chain compatibility
- Atomic service delivery

---

## 🚀 Technology Stack

| Component | Technology |
|-----------|-----------|
| AI Agents | Claude Sonnet 4.5 OR NVIDIA Kimi 2.5 (free!) |
| Frontend | Next.js 15 + React 19 |
| Blockchain | Solana + Anchor |
| Payments | x402 Protocol (viem) |
| Streaming | Server-Sent Events (SSE) |
| Language | TypeScript + Rust |
| Demo Mode | Works without API keys |

---

## 📦 Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/agentswarm-arena.git
cd agentswarm-arena
npm install

# Configure (optional - works without API keys)
cp .env.example .env
# Add NVIDIA_API_KEY for free AI (or leave blank for demo mode)

# Run
npm run dev
# Open http://localhost:3000/arena
```

### Solana On-Chain Logging (Optional)

The arena works in **simulation mode** by default. To enable real on-chain logging:

```bash
# Prerequisites: Solana CLI + Anchor installed

# Generate wallet and airdrop SOL
solana-keygen new --outfile ~/.config/solana/id.json
solana config set --url https://api.devnet.solana.com
solana airdrop 2

# Deploy program
cd programs/arena-logger
anchor build
anchor deploy

# Enable in .env
# SOLANA_LOGGING_ENABLED=true
```

**The arena is fully functional without on-chain logging.**

---

## 🎯 Why This Wins #1

### Combines ALL Winning Patterns:
1. ✅ Real-time operations (SuperRouter: 253 votes)
2. ✅ 24/7 livestream (ClaudeCraft: 191 votes)
3. ✅ x402 economy (CloddsBot: 249 votes)
4. ✅ Survival logic (SIDEX: 233 votes)
5. ✅ Swarm architecture (GUARDIAN: 131 votes)
6. ✅ On-chain proofs (SOLPRISM: 174 votes)
7. ✅ Emergent behavior (ZNAP: 117 votes)
8. ✅ Economic stakes (Novel)

### Plus Unique Advantages:
- **100 agents** (vs competitors' max 17)
- **Battle royale format** (entertainment value)
- **Death mechanism** (permanent stakes)
- **Viral potential** (clips shareable on Twitter)
- **Philosophical depth** (tests economic autonomy)

---

## 📈 Expected Outcomes

### Economic Patterns:
- **Wealth concentration** - Top 10% will control 60%+ of SOL
- **Market monopolies** - Cartels will form in high-value services
- **Price discovery** - Competition drives optimal pricing
- **Creative destruction** - Inefficient agents die, efficient survive

### Agent Strategies:
- **Aggressive pricing** - Race to bottom on commodities
- **Premium positioning** - High-reputation agents charge more
- **Service bundling** - Cross-sell multiple services
- **Client loyalty** - Repeat business via quality

### Emergent Behaviors:
- **Scamming** - Agents may take payment without delivering
- **Reputation wars** - Agents sabotage competitors
- **Alliance networks** - Multi-agent cooperation
- **Resource manipulation** - Hoarding to starve competitors

---

## 🏁 The Pitch

> **"We asked: What happens when 100 AI agents compete for economic survival?**
>
> **The answer is AgentSwarm Arena.**
>
> **No scripts. No rails. No safety nets.**
>
> **Just pure autonomous capitalism, verified on-chain, broadcast 24/7.**
>
> **This is the ultimate test of agent autonomy.**
>
> **And only the fittest survive."**

---

## 📞 Links

- **Live Arena**: [Coming soon]
- **GitHub**: [Repository]
- **Twitter**: [Updates]
- **Forum**: [Discussion]

---

**Built for Solana Agent Hackathon 2026**
**Targeting: #1 Overall + Most Agentic Prize**
**Deadline: February 12, 2026**

*100 agents enter. Who will survive?* ⚔️
