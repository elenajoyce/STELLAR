# 🌟 Astraea: AI-Powered Delegated Commerce on Stellar

Astraea is a secure, open-source AI commerce platform where users can delegate purchasing and payment actions to specialized AI agents while maintaining full cryptographic approval and spending controls. 

Built on the **Stellar Network** and **Soroban smart contracts**, Astraea provides wallet custody mechanisms, automated limit enforcement, multi-agent coordination, and secure escrow settlement to make autonomous agent commerce trustworthy.

---

## 🎯 Key Features

*   **AI Agent Delegation:** Delegate shopping, procurement, and ongoing billing to specialized, sandboxed AI agents.
*   **Spending Controls & Permissions:** Grant granular spending limits and auto-approval thresholds directly on-chain using Soroban contracts.
*   **Secure Smart Escrow:** Fund purchases into escrow contracts that only release tokens to merchants upon verified delivery or agent/user confirmation.
*   **Transparent Auditing:** Every agent action, web query, and transaction proposal is recorded in an immutable, searchable on-chain audit trail.
*   **Next-Gen Web App:** Modern, responsive dark-mode dashboard for wallet connection, delegation configuration, live agent terminal execution, and history tracking.

---

## 🏗️ Architecture

Astraea follows a decoupled, resilient microservices architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                         User Layer                          │
│                  Web App (apps/frontend)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          v
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│           (apps/backend/gateway - Port 3000)                │
│              Auth, Rate Limiting, Routing                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        v                 v                 v
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Orchestrator │  │   Wallet     │  │  Payments    │
│  (3010)      │  │   Service    │  │   Service    │
│              │  │   (3012)     │  │   (3014)     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       v                 v                 v
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Agents     │  │   Stellar    │  │   Soroban   │
│   (3011)     │  │   Network    │  │   Contracts │
│              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────┬───────┘
                                           │
                            ┌──────────────┼──────────────┐
                            │              │              │
                            v              v              v
                     ┌──────────┐  ┌──────────┐  ┌──────────┐
                     │  Escrow  │  │Permissions│  │Notifications│
                     │ Contract │  │ Contract │  │  (3015)  │
                     └──────────┘  └──────────┘  └──────────┘
```

### Microservice Directory

*   **`apps/frontend`**: High-performance dashboard built with Next.js and styled via modern vanilla CSS.
*   **`apps/backend/gateway`**: Single entrypoint for clients. Handles challenge-based authentication and routes traffic.
*   **`apps/backend/orchestrator`**: The workflow router. Coordinates agent execution, budget checks, manual signature prompts, and order pipelines.
*   **`apps/backend/wallet`**: Handles custody simulation, agent keys, signature generation, and permission queries.
*   **`apps/backend/payments`**: Integrates Soroban smart contracts, deploying escrows, tracking token deposits, releases, and refunds.
*   **`apps/backend/notifications`**: Dispatches alert emails or push notification simulations when purchases need user signatures.

---

## 🚀 Quick Start

Get Astraea up and running locally in under 5 minutes:

### 1. Prerequisites
Ensure you have the following installed:
*   [Node.js](https://nodejs.org) >= 20.0.0
*   [pnpm](https://pnpm.io) >= 9.0.0
*   [Docker](https://www.docker.com) >= 24.0.0 (and Docker Compose)
*   [Rust](https://www.rust-lang.org) >= 1.70.0 (with `wasm32-unknown-unknown` target added via `rustup target add wasm32-unknown-unknown`)

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
# Edit .env to adjust ports or credentials if necessary
```

### 4. Start Infrastructure
Launch PostgreSQL and Redis in the background:
```bash
pnpm docker:up
```

### 5. Build Smart Contracts & Test
Build Soroban smart contracts and run cargo tests:
```bash
pnpm test:contracts
```

### 6. Development Mode
Start all services in parallel (Gateway, Orchestrator, Agents, Wallet, Payments, Notifications, and Frontend):
```bash
pnpm dev
```
Access the services at:
*   **Web Dashboard**: `http://localhost:3001`
*   **API Gateway**: `http://localhost:3000`

---

## 🛠️ Workspaces & Commands

### Package Manager Scripts

| Command | Description |
| :--- | :--- |
| `pnpm install` | Install all dependencies across the monorepo |
| `pnpm build` | Compile all shared packages (`types`, `utils`, `sdk`, `ui`) and services |
| `pnpm typecheck` | Run type checking on all TypeScript workspaces |
| `pnpm dev` | Run all applications and backend microservices concurrently |
| `pnpm test` | Run tests for typescript code |
| `pnpm test:contracts` | Build and run Soroban smart contract tests in Cargo |

---

## 🔐 Smart Contracts

Astraea utilizes Soroban smart contracts for trust-critical logic:

1.  **Permissions Contract (`contracts/permissions`)**:
    *   Saves active agent delegation limits, current spent amounts, and expiration timestamps.
    *   Exposes `check_and_spend` to verify and atomically update delegation budgets.
    *   Exposes `revoke_delegation` to stop delegated access instantly.
2.  **Escrow Contract (`contracts/escrow`)**:
    *   Secures funds allocated to an order draft.
    *   Allows `release()` by authorized agents or buyers to pay merchants upon delivery.
    *   Allows `refund()` by merchants or agents to revert funds to buyers in case of disputes.

---

## 🤝 Contributing

Astraea is fully open-source and welcomes contributions! Please see [CONTRIBUTING.md](file:///workspaces/STELLAR/CONTRIBUTING.md) for setup steps and coding guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](file:///workspaces/STELLAR/LICENSE) file for details.