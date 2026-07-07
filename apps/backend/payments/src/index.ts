import express, { Request, Response } from 'express';
import cors from 'cors';
import { Logger } from '@astraea/utils';

const app = express();
const PORT = process.env.PORT || 3014;

app.use(cors());
app.use(express.json());

// In-memory store of active escrow accounts
// Maps escrowAddress -> { buyer, agent, merchant, amount, tokenAddress, status: 'initialized'|'funded'|'released'|'refunded' }
const escrows = new Map<string, any>();

// POST /escrow/create
app.post('/escrow/create', (req: Request, res: Response) => {
  const { buyer, agent, merchant, amount, tokenAddress } = req.body;

  if (!buyer || !agent || !merchant || !amount) {
    return res.status(400).json({ message: 'buyer, agent, merchant, and amount are required' });
  }

  const escrowAddress = `escrow_contract_${Math.random().toString(36).substring(2, 10)}`;

  Logger.info(`[Soroban] Registering & Initializing EscrowContract at ${escrowAddress}`);
  Logger.info(`[Soroban] Buyer: ${buyer}, Agent: ${agent}, Merchant: ${merchant}, Amount: ${amount}`);

  escrows.set(escrowAddress, {
    buyer,
    agent,
    merchant,
    amount,
    tokenAddress: tokenAddress || 'native',
    status: 'initialized'
  });

  res.status(201).json({
    success: true,
    escrowAddress,
    status: 'initialized'
  });
});

// POST /escrow/deposit
app.post('/escrow/deposit', (req: Request, res: Response) => {
  const { escrowAddress } = req.body;

  if (!escrowAddress) {
    return res.status(400).json({ message: 'escrowAddress is required' });
  }

  const escrow = escrows.get(escrowAddress);
  if (!escrow) {
    return res.status(404).json({ message: 'Escrow contract not found' });
  }

  Logger.info(`[Soroban] Invoking deposit() on EscrowContract: transferring ${escrow.amount} tokens from Buyer ${escrow.buyer}`);
  
  escrow.status = 'funded';
  escrows.set(escrowAddress, escrow);

  res.json({
    success: true,
    escrowAddress,
    status: 'funded'
  });
});

// POST /escrow/release
app.post('/escrow/release', (req: Request, res: Response) => {
  const { escrowAddress, authorizedBy } = req.body;

  if (!escrowAddress || !authorizedBy) {
    return res.status(400).json({ message: 'escrowAddress and authorizedBy are required' });
  }

  const escrow = escrows.get(escrowAddress);
  if (!escrow) {
    return res.status(404).json({ message: 'Escrow contract not found' });
  }

  if (escrow.status !== 'funded') {
    return res.status(400).json({ message: `Cannot release escrow in status: ${escrow.status}` });
  }

  Logger.info(`[Soroban] Invoking release() on EscrowContract. Authorized by: ${authorizedBy}`);
  Logger.info(`[Soroban] Transferring ${escrow.amount} tokens from Escrow to Merchant: ${escrow.merchant}`);

  escrow.status = 'released';
  escrows.set(escrowAddress, escrow);

  res.json({
    success: true,
    escrowAddress,
    status: 'released'
  });
});

// POST /escrow/refund
app.post('/escrow/refund', (req: Request, res: Response) => {
  const { escrowAddress, authorizedBy } = req.body;

  if (!escrowAddress || !authorizedBy) {
    return res.status(400).json({ message: 'escrowAddress and authorizedBy are required' });
  }

  const escrow = escrows.get(escrowAddress);
  if (!escrow) {
    return res.status(404).json({ message: 'Escrow contract not found' });
  }

  if (escrow.status !== 'funded') {
    return res.status(400).json({ message: `Cannot refund escrow in status: ${escrow.status}` });
  }

  Logger.info(`[Soroban] Invoking refund() on EscrowContract. Authorized by: ${authorizedBy}`);
  Logger.info(`[Soroban] Transferring ${escrow.amount} tokens back to Buyer: ${escrow.buyer}`);

  escrow.status = 'refunded';
  escrows.set(escrowAddress, escrow);

  res.json({
    success: true,
    escrowAddress,
    status: 'refunded'
  });
});

app.listen(PORT, () => {
  Logger.info(`Astraea Payments service running on port ${PORT}`);
});
