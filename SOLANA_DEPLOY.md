# 🔗 Solana On-Chain Logging Deployment Guide

This guide explains how to deploy the AgentSwarm Arena logging program to Solana devnet.

## What Gets Logged On-Chain?

The `arena_logger` Anchor program logs:

1. **Transactions** (`log_transaction`)
   - Agent-to-agent payments
   - Service type (trading, research, security, etc.)
   - Amount in SOL
   - Timestamp
   - All verified immutably on Solana

2. **Deaths** (`log_death`)
   - Agent ID and name
   - Final balance
   - Services completed
   - Permanent record of agent lifecycle

3. **Arena Stats** (`update_stats`)
   - Total alive/dead agents
   - Average balance
   - Wealth inequality (Gini coefficient)
   - Global arena state

## Program Architecture

```rust
// Account Structures
pub struct ArenaTransaction {
    transaction_id: String,    // Unique transaction ID
    from_agent: String,        // Sender agent ID
    to_agent: String,          // Recipient agent ID
    amount: u64,               // Amount in lamports
    service_type: String,      // Service provided
    timestamp: i64,            // Unix timestamp
}

pub struct AgentDeath {
    agent_id: String,          // Dead agent ID
    agent_name: String,        // Agent name
    final_balance: u64,        // Balance at death
    services_completed: u64,   // Lifetime services
    timestamp: i64,            // Time of death
}

pub struct ArenaStats {
    total_agents: u64,         // Initial agent count
    alive_agents: u64,         // Current alive
    dead_agents: u64,          // Total deaths
    total_transactions: u64,   // Lifetime transactions
    avg_balance: u64,          // Average balance
    gini_coefficient: u32,     // Wealth inequality (0-100)
    last_updated: i64,         // Last update time
}
```

## Prerequisites

1. **Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **Anchor Framework**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

3. **Rust** (if not installed)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

## Deployment Steps

### 1. Configure Solana

```bash
# Set to devnet
solana config set --url https://api.devnet.solana.com

# Generate a new wallet (or use existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Check your public key
solana address
# Output: <YOUR_WALLET_ADDRESS>

# Airdrop SOL for deployment (devnet only)
solana airdrop 2

# Verify balance
solana balance
# Should show: 2 SOL
```

### 2. Build the Program

```bash
cd programs/arena-logger

# Build (may take 5-10 minutes first time)
anchor build

# The compiled program will be at:
# target/deploy/arena_logger.so
```

### 3. Deploy to Devnet

```bash
# Deploy the program
anchor deploy

# Output will show your program ID:
# Program Id: <YOUR_PROGRAM_ID>
```

### 4. Update Environment Variables

Add to your `.env`:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PROGRAM_ID=<YOUR_PROGRAM_ID>  # From deploy output
SOLANA_LOGGING_ENABLED=true
```

### 5. Initialize Arena Stats Account

Run this once to set up the arena stats PDA:

```typescript
// This will be called automatically on first arena start
// Or you can run manually via the arena CLI
```

### 6. Verify Deployment

```bash
# Check program account
solana program show <YOUR_PROGRAM_ID>

# View recent transactions
solana transaction-history <YOUR_WALLET_ADDRESS>
```

## Cost Estimation

**Devnet**: FREE (use airdrops)

**Mainnet** (if deploying to production):
- Program deployment: ~0.5 SOL (one-time)
- Transaction logging: ~0.000005 SOL per transaction
- For 100 agents doing 1000 transactions/day: ~0.005 SOL/day (~$1/day)

## Monitoring

View your program's transactions:

```bash
# Real-time logs
solana logs <YOUR_PROGRAM_ID>

# View account data
solana account <ACCOUNT_ADDRESS>
```

Or use Solana Explorer:
- Devnet: https://explorer.solana.com/?cluster=devnet
- Search for your program ID

## Troubleshooting

### "Insufficient funds"
```bash
solana airdrop 2  # Get more devnet SOL
```

### "Program modification not supported"
```bash
# You can't modify a deployed program
# Deploy as a new program or use upgradeable programs
anchor deploy --program-id <NEW_KEYPAIR>
```

### "Account already exists"
```bash
# Close and recreate the account
# Or use a different seed for PDA
```

### Version mismatch
```bash
# Update Anchor dependencies
yarn upgrade @coral-xyz/anchor@latest

# Add to Anchor.toml:
[toolchain]
anchor_version = "0.32.1"
```

## Development vs Production

**Development (Current)**:
- Simulation mode (no real transactions)
- Instant feedback
- No SOL cost
- Perfect for testing

**Production (With deployment)**:
- Real on-chain logging
- Permanent records
- Verifiable by anyone
- Small SOL cost per transaction

**Recommendation**: Keep simulation mode for development, deploy only for final submission/demo.

## Integration with Arena

Once deployed, the arena will automatically:
1. Log every transaction to Solana
2. Record agent deaths permanently
3. Update arena stats every tick
4. Show "ON-CHAIN" badge in UI

## Questions?

- Anchor Docs: https://www.anchor-lang.com/
- Solana Docs: https://docs.solana.com/
- Discord: [Your Discord]

---

**Note**: The arena is fully functional without on-chain logging. Deploy only if you want permanent on-chain records.
