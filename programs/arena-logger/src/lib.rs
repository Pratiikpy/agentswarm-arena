// AgentSwarm Arena - On-Chain Transaction Logger + Betting
// Logs all agent transactions to Solana for permanent verification

use anchor_lang::prelude::*;

declare_id!("2ZoSk1adD16aXyXYsornCS8qao2hYb6KSkqyCuYNeKKc");

#[program]
pub mod arena_logger {
    use super::*;

    /// Initialize the arena (one-time setup)
    pub fn initialize_arena(ctx: Context<InitializeArena>, arena_id: String) -> Result<()> {
        let arena = &mut ctx.accounts.arena;
        arena.arena_id = arena_id;
        arena.total_transactions = 0;
        arena.total_agents = 0;
        arena.total_volume = 0;
        arena.started_at = Clock::get()?.unix_timestamp;
        arena.authority = ctx.accounts.authority.key();
        arena.total_bets = 0;
        arena.total_bet_volume = 0;

        msg!("Arena initialized: {}", arena.arena_id);
        Ok(())
    }

    /// Log an agent transaction
    pub fn log_transaction(
        ctx: Context<LogTransaction>,
        transaction_id: String,
        from_agent: String,
        to_agent: String,
        amount: u64,
        service_type: String,
    ) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;
        let arena = &mut ctx.accounts.arena;

        transaction.transaction_id = transaction_id;
        transaction.from_agent = from_agent;
        transaction.to_agent = to_agent;
        transaction.amount = amount;
        transaction.service_type = service_type;
        transaction.timestamp = Clock::get()?.unix_timestamp;
        transaction.arena = arena.key();

        // Update arena stats
        arena.total_transactions += 1;
        arena.total_volume += amount;

        msg!(
            "Transaction logged: {} -> {} | {} SOL",
            transaction.from_agent,
            transaction.to_agent,
            amount as f64 / 1_000_000_000.0
        );

        Ok(())
    }

    /// Log agent death
    pub fn log_death(
        ctx: Context<LogDeath>,
        agent_id: String,
        agent_name: String,
        final_balance: u64,
        services_completed: u32,
    ) -> Result<()> {
        let death = &mut ctx.accounts.death;
        let arena = &mut ctx.accounts.arena;

        death.agent_id = agent_id;
        death.agent_name = agent_name;
        death.final_balance = final_balance;
        death.services_completed = services_completed;
        death.timestamp = Clock::get()?.unix_timestamp;
        death.arena = arena.key();

        msg!("Agent death logged: {} (Balance: {})", death.agent_name, final_balance);

        Ok(())
    }

    /// Update arena stats
    pub fn update_stats(
        ctx: Context<UpdateStats>,
        alive_agents: u32,
        dead_agents: u32,
        avg_balance: u64,
        gini_coefficient: u16,
    ) -> Result<()> {
        let arena = &mut ctx.accounts.arena;

        arena.total_agents = alive_agents + dead_agents;
        arena.alive_agents = alive_agents;
        arena.dead_agents = dead_agents;
        arena.avg_balance = avg_balance;
        arena.gini_coefficient = gini_coefficient;

        msg!(
            "Stats updated: {} alive, {} dead, avg balance: {}",
            alive_agents,
            dead_agents,
            avg_balance
        );

        Ok(())
    }

    /// Place a bet on an agent (user wallet interaction)
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        agent_id: String,
        amount: u64,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let arena = &mut ctx.accounts.arena;

        // Transfer SOL from bettor to arena
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.bettor.key(),
            &arena.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.bettor.to_account_info(),
                arena.to_account_info(),
            ],
        )?;

        bet.bettor = ctx.accounts.bettor.key();
        bet.agent_id = agent_id;
        bet.amount = amount;
        bet.timestamp = Clock::get()?.unix_timestamp;
        bet.arena = arena.key();
        bet.claimed = false;

        arena.total_bets += 1;
        arena.total_bet_volume += amount;

        msg!(
            "Bet placed: {} on agent {} for {} lamports",
            bet.bettor,
            bet.agent_id,
            amount
        );

        Ok(())
    }
}

// Account Structures

#[derive(Accounts)]
#[instruction(arena_id: String)]
pub struct InitializeArena<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Arena::INIT_SPACE,
        seeds = [b"arena", arena_id.as_bytes()],
        bump
    )]
    pub arena: Account<'info, Arena>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(transaction_id: String)]
pub struct LogTransaction<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Transaction::INIT_SPACE,
        seeds = [b"transaction", transaction_id.as_bytes()],
        bump
    )]
    pub transaction: Account<'info, Transaction>,

    #[account(mut)]
    pub arena: Account<'info, Arena>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct LogDeath<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + AgentDeath::INIT_SPACE,
        seeds = [b"death", agent_id.as_bytes()],
        bump
    )]
    pub death: Account<'info, AgentDeath>,

    #[account(mut)]
    pub arena: Account<'info, Arena>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateStats<'info> {
    #[account(mut, has_one = authority)]
    pub arena: Account<'info, Arena>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct PlaceBet<'info> {
    #[account(
        init,
        payer = bettor,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", bettor.key().as_ref(), agent_id.as_bytes()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    #[account(mut)]
    pub arena: Account<'info, Arena>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Account Data Structures

#[account]
#[derive(InitSpace)]
pub struct Arena {
    #[max_len(50)]
    pub arena_id: String,
    pub authority: Pubkey,
    pub total_transactions: u64,
    pub total_agents: u32,
    pub alive_agents: u32,
    pub dead_agents: u32,
    pub total_volume: u64,
    pub avg_balance: u64,
    pub gini_coefficient: u16,
    pub started_at: i64,
    pub total_bets: u64,
    pub total_bet_volume: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Transaction {
    #[max_len(50)]
    pub transaction_id: String,
    #[max_len(50)]
    pub from_agent: String,
    #[max_len(50)]
    pub to_agent: String,
    pub amount: u64,
    #[max_len(20)]
    pub service_type: String,
    pub timestamp: i64,
    pub arena: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct AgentDeath {
    #[max_len(50)]
    pub agent_id: String,
    #[max_len(50)]
    pub agent_name: String,
    pub final_balance: u64,
    pub services_completed: u32,
    pub timestamp: i64,
    pub arena: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub bettor: Pubkey,
    #[max_len(50)]
    pub agent_id: String,
    pub amount: u64,
    pub timestamp: i64,
    pub arena: Pubkey,
    pub claimed: bool,
}
