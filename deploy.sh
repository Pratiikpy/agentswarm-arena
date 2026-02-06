#!/bin/bash
# AgentSwarm Arena - Deploy Anchor Program to Solana Devnet
#
# Prerequisites:
#   1. Get 2+ SOL from https://faucet.solana.com (connect browser wallet or paste address)
#   2. Your wallet address: $(solana address)
#   3. Run: bash deploy.sh

set -e

echo "🏟️  AgentSwarm Arena - Deploying to Solana Devnet"
echo ""

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "💰 Wallet balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2.0" | bc -l) )); then
  echo ""
  echo "❌ Need at least 2 SOL for deployment. Current: $BALANCE SOL"
  echo ""
  echo "Get free devnet SOL at: https://faucet.solana.com"
  echo "Your wallet address: $(solana address)"
  echo ""
  exit 1
fi

# Add Solana tools to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "🔨 Building Anchor program..."
anchor build

echo "🚀 Deploying to devnet..."
anchor deploy --provider.cluster devnet

# Get the program ID
PROGRAM_ID=$(solana address -k target/deploy/arena_logger-keypair.json)
echo ""
echo "✅ Program deployed!"
echo "📋 Program ID: $PROGRAM_ID"
echo ""

# Update .env
if [ -f .env ]; then
  # Update existing .env
  sed -i.bak "s|^ARENA_PROGRAM_ID=.*|ARENA_PROGRAM_ID=$PROGRAM_ID|" .env
  sed -i.bak "s|^SOLANA_LOGGING_ENABLED=.*|SOLANA_LOGGING_ENABLED=true|" .env
  sed -i.bak "s|^# SOLANA_LOGGING_ENABLED=.*|SOLANA_LOGGING_ENABLED=true|" .env
  rm -f .env.bak
  echo "📝 Updated .env with program ID and enabled on-chain logging"
else
  cp .env.example .env
  sed -i.bak "s|^ARENA_PROGRAM_ID=.*|ARENA_PROGRAM_ID=$PROGRAM_ID|" .env
  sed -i.bak "s|^SOLANA_LOGGING_ENABLED=.*|SOLANA_LOGGING_ENABLED=true|" .env
  rm -f .env.bak
  echo "📝 Created .env with program ID"
fi

echo ""
echo "🎮 Done! Run 'npm run dev' and visit http://localhost:3000"
echo "📊 Transactions will now be logged on-chain to Solana devnet"
echo "🔍 View on Solana Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
