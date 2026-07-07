#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DelegationInfo {
    pub limit: i128,
    pub spent: i128,
    pub approval_threshold: i128,
    pub expires_at: u64,
    pub is_active: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Delegation(Address, Address), // (User, Agent) -> DelegationInfo
}

#[contract]
pub struct PermissionsContract;

#[contractimpl]
impl PermissionsContract {
    pub fn set_delegation(
        env: Env,
        user: Address,
        agent: Address,
        limit: i128,
        approval_threshold: i128,
        expires_at: u64,
    ) {
        user.require_auth();

        let key = DataKey::Delegation(user.clone(), agent.clone());
        let info = DelegationInfo {
            limit,
            spent: 0,
            approval_threshold,
            expires_at,
            is_active: true,
        };

        env.storage().persistent().set(&key, &info);
        env.events().publish((Symbol::new(&env, "set_delegation"), user, agent), limit);
    }

    pub fn check_and_spend(
        env: Env,
        user: Address,
        agent: Address,
        amount: i128,
    ) -> bool {
        agent.require_auth();

        let key = DataKey::Delegation(user.clone(), agent.clone());
        if !env.storage().persistent().has(&key) {
            panic!("no delegation found");
        }

        let mut info: DelegationInfo = env.storage().persistent().get(&key).unwrap();

        if !info.is_active {
            panic!("delegation is inactive");
        }

        let current_time = env.ledger().timestamp();
        if current_time > info.expires_at {
            panic!("delegation has expired");
        }

        if info.spent + amount > info.limit {
            panic!("delegation limit exceeded");
        }

        info.spent += amount;
        env.storage().persistent().set(&key, &info);

        env.events().publish((Symbol::new(&env, "delegated_spend"), user, agent), amount);
        true
    }

    pub fn revoke_delegation(env: Env, user: Address, agent: Address) {
        user.require_auth();

        let key = DataKey::Delegation(user.clone(), agent.clone());
        if !env.storage().persistent().has(&key) {
            panic!("no delegation found");
        }

        let mut info: DelegationInfo = env.storage().persistent().get(&key).unwrap();
        info.is_active = false;
        
        env.storage().persistent().set(&key, &info);
        env.events().publish((Symbol::new(&env, "revoke_delegation"), user, agent), ());
    }

    pub fn get_delegation(env: Env, user: Address, agent: Address) -> DelegationInfo {
        let key = DataKey::Delegation(user, agent);
        if !env.storage().persistent().has(&key) {
            panic!("no delegation found");
        }
        env.storage().persistent().get(&key).unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_delegation_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let user = Address::generate(&env);
        let agent = Address::generate(&env);

        let contract_id = env.register_contract(None, PermissionsContract);
        let client = PermissionsContractClient::new(&env, &contract_id);

        let expires_at = env.ledger().timestamp() + 3600;
        client.set_delegation(&user, &agent, &1000, &200, &expires_at);

        let info = client.get_delegation(&user, &agent);
        assert_eq!(info.limit, 1000);
        assert_eq!(info.spent, 0);
        assert_eq!(info.is_active, true);

        // Perform delegated spend
        let success = client.check_and_spend(&user, &agent, &300);
        assert!(success);

        let info2 = client.get_delegation(&user, &agent);
        assert_eq!(info2.spent, 300);

        // Revoke delegation
        client.revoke_delegation(&user, &agent);
        let info3 = client.get_delegation(&user, &agent);
        assert_eq!(info3.is_active, false);
    }
}
