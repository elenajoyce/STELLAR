# Contributing to Astraea

First off, thank you for taking the time to contribute! We welcome contributions of all kinds: bug reports, feature requests, documentation, design updates, and smart contract improvements.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct. Please treat all contributors with respect.

## Getting Started

1.  **Fork the Repository:** Create a personal fork of the project on GitHub.
2.  **Clone the Repository:** Clone your fork to your local machine.
    ```bash
    git clone https://github.com/your-username/astraea.git
    cd astraea
    ```
3.  **Install Dependencies:** Ensure you have Node.js 20+, pnpm 9+, and Rust stable installed, then install workspace dependencies:
    ```bash
    pnpm install
    ```
4.  **Set up Environment:** Copy `.env.example` to `.env` and configure your credentials.
5.  **Create a Branch:** Create a branch for your changes:
    ```bash
    git checkout -b feat/your-feature-name
    ```

## Development Standards

### TypeScript
*   Use strict type checking. Avoid using the `any` type whenever possible.
*   Document public methods, classes, and exported interfaces.
*   Ensure that `pnpm typecheck` compiles clean with no warnings.

### Soroban Smart Contracts
*   Soroban contracts are located in `contracts/`.
*   Ensure contract methods follow Soroban security best practices, explicitly requiring authorization using `require_auth()` where appropriate.
*   Write unit tests inside the contract crates and run them via:
    ```bash
    cd contracts
    cargo test
    ```

### Commits
*   Use Conventional Commits formatting:
    *   `feat: add Soroban permissions contract`
    *   `fix: resolve api gateway timeout error`
    *   `docs: update quick start guidelines`

## Pull Request Process

1.  Ensure all tests are passing (`pnpm test` and `pnpm test:contracts`).
2.  Verify formatting complies with rules by running `pnpm format`.
3.  Update the `README.md` or other docs if you are introducing new API endpoints or changing configuration parameters.
4.  Submit a Pull Request targeting the `main` branch. Provide a comprehensive summary of changes and reference any related issues.
