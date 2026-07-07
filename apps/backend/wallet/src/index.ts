import express, { Request, Response } from 'express';
import cors from 'cors';
import { Logger, StellarHelper } from '@astraea/utils';
import { Delegation } from '@astraea/types';
import { Keypair } from '@stellar/stellar-sdk';

const app = express();
const PORT = process.env.PORT || 3012;

app.use(cors());
app.use(express.json());

// In-memory store of delegations (in place of Postgres)
const delegations: Delegation[] = [];

// In-memory store of generated agent private keys
// This represents key custody for active agents that execute payments
const agentKeys = new Map<string, { publicKey: string; secretKey: string }>();

// Seed initial agent key for agent_procurement_1, agent_travel_2, agent_digital_3
['agent_procurement_1', 'agent_travel_2', 'agent_digital_3'].forEach(id => {
  const kp = StellarHelper.generateKeypair();
  agentKeys.set(id, kp);
  Logger.info(`Generated keypair for agent: ${id} -> ${kp.publicKey}`);
});

// GET /delegations
app.get('/delegations', (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const userDelegations = delegations.filter(d => d.userId === userId);
  res.json(userDelegations);
});

// POST /delegations
app.post('/delegations', (req: Request, res: Response) => {
  const { userId, agentId, spendLimit, approvalThreshold, expiresAt } = req.body;

  if (!userId || !agentId || !spendLimit || !approvalThreshold || !expiresAt) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  // Create a new delegation structure
  const newDelegation: Delegation = {
    id: `del_${Math.random().toString(36).substring(2, 10)}`,
    userId,
    agentId,
    status: 'active',
    spendLimit,
    spentAmount: '0',
    approvalThreshold,
    expiresAt: new Date(expiresAt),
    createdAt: new Date(),
    escrowAddress: `escrow_${Math.random().toString(36).substring(2, 10)}` // Mock deployed contract
  };

  // Simulate Soroban contract invocation for "set_delegation"
  Logger.info(`[Soroban] Invoking set_delegation on Permissions Contract: User: ${userId}, Agent: ${agentId}, Limit: ${spendLimit}`);
  
  delegations.push(newDelegation);
  res.status(201).json(newDelegation);
});

// DELETE /delegations/:id
app.delete('/delegations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const index = delegations.findIndex(d => d.id === id && d.userId === userId);
  if (index === -1) {
    return res.status(404).json({ message: 'Delegation not found' });
  }

  // Simulate Soroban contract invocation for "revoke_delegation"
  const delegation = delegations[index];
  Logger.info(`[Soroban] Invoking revoke_delegation on Permissions Contract for Agent: ${delegation.agentId}`);

  delegations[index].status = 'revoked';
  res.json({ success: true, delegation: delegations[index] });
});

// POST /keys/sign
app.post('/keys/sign', (req: Request, res: Response) => {
  const { agentId, message } = req.body;

  if (!agentId || !message) {
    return res.status(400).json({ message: 'agentId and message are required' });
  }

  const keys = agentKeys.get(agentId);
  if (!keys) {
    return res.status(404).json({ message: 'Agent wallet keypair not found' });
  }

  const signature = StellarHelper.signMessage(message, keys.secretKey);
  res.json({
    publicKey: keys.publicKey,
    signature
  });
});

app.listen(PORT, () => {
  Logger.info(`Astraea Wallet service running on port ${PORT}`);
});
