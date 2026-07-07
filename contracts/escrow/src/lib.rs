#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Buyer,
    Agent,
    Merchant,
    Token,
    Amount,
    IsInitialized,
    IsCompleted,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    pub fn initialize(
        env: Env,
        buyer: Address,
        agent: Address,
        merchant: Address,
        token: Address,
        amount: i128,
    ) {
        if env.storage().instance().has(&DataKey::IsInitialized) {
            panic!("already initialized");
        }

        env.storage().instance().set(&DataKey::Buyer, &buyer);
        env.storage().instance().set(&DataKey::Agent, &agent);
        env.storage().instance().set(&DataKey::Merchant, &merchant);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Amount, &amount);
        env.storage().instance().set(&DataKey::IsInitialized, &true);
        env.storage().instance().set(&DataKey::IsCompleted, &false);
    }

    pub fn deposit(env: Env) {
        let is_completed: bool = env.storage().instance().get(&DataKey::IsCompleted).unwrap_or(false);
        if is_completed {
            panic!("escrow already completed");
        }

        let buyer: Address = env.storage().instance().get(&DataKey::Buyer).unwrap();
        buyer.require_auth();

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&buyer, &env.current_contract_address(), &amount);
    }

    pub fn release(env: Env, caller: Address) {
        let is_completed: bool = env.storage().instance().get(&DataKey::IsCompleted).unwrap_or(false);
        if is_completed {
            panic!("escrow already completed");
        }

        // Verify the caller authorized the transaction
        caller.require_auth();

        // Release can be authorized by either the buyer or the delegated agent
        let buyer: Address = env.storage().instance().get(&DataKey::Buyer).unwrap();
        let agent: Address = env.storage().instance().get(&DataKey::Agent).unwrap();

        if caller != buyer && caller != agent {
            panic!("not authorized to release escrow");
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let merchant: Address = env.storage().instance().get(&DataKey::Merchant).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();

        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &merchant, &amount);

        env.storage().instance().set(&DataKey::IsCompleted, &true);
        env.events().publish((Symbol::new(&env, "release"),), amount);
    }

    pub fn refund(env: Env, caller: Address) {
        let is_completed: bool = env.storage().instance().get(&DataKey::IsCompleted).unwrap_or(false);
        if is_completed {
            panic!("escrow already completed");
        }

        // Verify the caller authorized the transaction
        caller.require_auth();

        // Refund can be authorized by the merchant (cancelling order) or the agent (resolving dispute)
        let merchant: Address = env.storage().instance().get(&DataKey::Merchant).unwrap();
        let agent: Address = env.storage().instance().get(&DataKey::Agent).unwrap();

        if caller != merchant && caller != agent {
            panic!("not authorized to refund escrow");
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let buyer: Address = env.storage().instance().get(&DataKey::Buyer).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();

        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &buyer, &amount);

        env.storage().instance().set(&DataKey::IsCompleted, &true);
        env.events().publish((Symbol::new(&env, "refund"),), amount);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, IntoVal};

    #[test]
    fn test_escrow_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let buyer = Address::generate(&env);
        let agent = Address::generate(&env);
        let merchant = Address::generate(&env);
        
        // Mock a token contract
        let token_admin = Address::generate(&env);
        let token_contract_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_client = token::StellarAssetClient::new(&env, &token_contract_id);
        let token_main_client = token::Client::new(&env, &token_contract_id);
        
        token_client.mint(&buyer, &1000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        client.initialize(&buyer, &agent, &merchant, &token_contract_id, &400);

        client.deposit();
        assert_eq!(token_main_client.balance(&buyer), 600);
        assert_eq!(token_main_client.balance(&contract_id), 400);

        client.release(&buyer);
        assert_eq!(token_main_client.balance(&merchant), 400);
        assert_eq!(token_main_client.balance(&contract_id), 0);
    }
}
