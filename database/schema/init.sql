-- Initial schema for Astraea

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(56) PRIMARY KEY, -- Stellar public key
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    capabilities TEXT[] NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Delegations Table
CREATE TABLE IF NOT EXISTS delegations (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(56) REFERENCES users(id) ON DELETE CASCADE,
    agent_id VARCHAR(50) REFERENCES agents(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    spend_limit NUMERIC(20, 7) NOT NULL, -- XLM or token value
    spent_amount NUMERIC(20, 7) DEFAULT 0,
    approval_threshold NUMERIC(20, 7) NOT NULL,
    escrow_address VARCHAR(56),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(56) REFERENCES users(id) ON DELETE CASCADE,
    agent_id VARCHAR(50) REFERENCES agents(id) ON DELETE CASCADE,
    delegation_id VARCHAR(50) REFERENCES delegations(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL,
    merchant_name VARCHAR(255) NOT NULL,
    product_description TEXT NOT NULL,
    price NUMERIC(20, 7) NOT NULL,
    escrow_address VARCHAR(56),
    tx_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    delegation_id VARCHAR(50) REFERENCES delegations(id) ON DELETE CASCADE,
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE SET NULL,
    actor VARCHAR(20) NOT NULL, -- 'agent', 'user', 'system'
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    tx_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
