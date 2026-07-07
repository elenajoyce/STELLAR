import express, { Request, Response } from 'express';
import cors from 'cors';
import { Logger } from '@astraea/utils';
import { Order, AuditLog, Delegation } from '@astraea/types';

const app = express();
const PORT = process.env.PORT || 3010;

app.use(cors());
app.use(express.json());

// In-memory databases
const orders: Order[] = [];
const auditLogs: AuditLog[] = [];

// Helper: Post notification
const sendNotification = async (userId: string, title: string, message: string) => {
  try {
    await fetch('http://localhost:3015/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type: 'email', title, message })
    });
  } catch (err) {
    Logger.error('Failed to send notification:', err);
  }
};

// Helper: Write audit log
const writeAuditLog = (delegationId: string, orderId: string | undefined, actor: 'agent' | 'user' | 'system', action: string, details: string) => {
  const log: AuditLog = {
    id: `log_${Math.random().toString(36).substring(2, 10)}`,
    delegationId,
    orderId,
    actor,
    action,
    details,
    createdAt: new Date()
  };
  auditLogs.push(log);
  Logger.info(`[Audit Log] ${actor.toUpperCase()} performed "${action}": ${details}`);
};

// GET /orders
app.get('/orders', (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const userOrders = orders.filter(o => o.userId === userId);
  res.json(userOrders);
});

// POST /orders (Delegate purchase task)
app.post('/orders', async (req: Request, res: Response) => {
  const { userId, delegationId, prompt } = req.body;

  if (!userId || !delegationId || !prompt) {
    return res.status(400).json({ message: 'userId, delegationId, and prompt are required' });
  }

  try {
    // 1. Fetch Delegation details from Wallet service
    const walletRes = await fetch(`http://localhost:3012/delegations?userId=${userId}`);
    if (!walletRes.ok) {
      return res.status(500).json({ message: 'Failed to contact Wallet service' });
    }
    const delegations: Delegation[] = await walletRes.json();
    const delegation = delegations.find(d => d.id === delegationId);

    if (!delegation) {
      return res.status(404).json({ message: 'Delegation not found for this user' });
    }

    if (delegation.status !== 'active') {
      return res.status(400).json({ message: `Delegation is not active (status: ${delegation.status})` });
    }

    // 2. Delegate finding purchase details to Agents Service
    const agentRes = await fetch('http://localhost:3011/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: delegation.agentId,
        prompt,
        delegationId,
        spendLimit: delegation.spendLimit
      })
    });

    if (!agentRes.ok) {
      const errData = await agentRes.json();
      return res.status(agentRes.status).json({ message: errData.message });
    }

    const agentData = await agentRes.json();
    const { merchantName, productDescription, price } = agentData;

    // 3. Create the order draft
    const orderId = `ord_${Math.random().toString(36).substring(2, 10)}`;
    const requiresApproval = parseFloat(price) >= parseFloat(delegation.approvalThreshold);

    const newOrder: Order = {
      id: orderId,
      userId,
      agentId: delegation.agentId,
      delegationId,
      status: requiresApproval ? 'pending_approval' : 'funding_escrow',
      merchantName,
      productDescription,
      price,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    orders.push(newOrder);
    writeAuditLog(delegationId, orderId, 'agent', 'order_draft_created', `Agent proposed purchase of "${productDescription}" from "${merchantName}" for ${price} XLM`);

    if (requiresApproval) {
      // Notify user that signature is required
      await sendNotification(
        userId,
        'Action Required: Approval Needed',
        `Your agent wants to purchase "${productDescription}" for ${price} XLM. This exceeds your auto-approval threshold of ${delegation.approvalThreshold} XLM.`
      );
      return res.status(201).json(newOrder);
    }

    // 4. Automated flow (no approval needed)
    // Deploy Soroban Escrow Contract
    const escrowRes = await fetch('http://localhost:3014/escrow/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer: userId,
        agent: delegation.agentId,
        merchant: merchantName,
        amount: parseFloat(price)
      })
    });

    if (!escrowRes.ok) {
      newOrder.status = 'cancelled';
      return res.status(500).json({ message: 'Failed to deploy escrow contract' });
    }

    const escrowData = await escrowRes.json();
    newOrder.escrowAddress = escrowData.escrowAddress;
    newOrder.status = 'escrow_funded';
    newOrder.updatedAt = new Date();

    // Call deposit to mock funding the escrow
    await fetch('http://localhost:3014/escrow/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escrowAddress: newOrder.escrowAddress })
    });

    writeAuditLog(delegationId, orderId, 'system', 'escrow_funded', `Soroban Escrow contract deployed at ${newOrder.escrowAddress} and funded with ${price} XLM`);

    // Simulate merchant delivery and auto-release in 8 seconds
    setTimeout(async () => {
      try {
        const orderIdx = orders.findIndex(o => o.id === orderId);
        if (orderIdx !== -1 && orders[orderIdx].status === 'escrow_funded') {
          orders[orderIdx].status = 'delivered';
          orders[orderIdx].updatedAt = new Date();
          writeAuditLog(delegationId, orderId, 'system', 'order_delivered', `Merchant shipped/delivered "${productDescription}"`);

          // Agent/buyer releases escrow
          await fetch('http://localhost:3014/escrow/release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ escrowAddress: newOrder.escrowAddress, authorizedBy: delegation.agentId })
          });

          orders[orderIdx].status = 'completed';
          orders[orderIdx].updatedAt = new Date();
          writeAuditLog(delegationId, orderId, 'agent', 'escrow_released', `Agent released ${price} XLM to merchant from escrow ${newOrder.escrowAddress}`);

          await sendNotification(
            userId,
            'Purchase Completed Successfully',
            `Your agent successfully completed the purchase of "${productDescription}" from "${merchantName}" for ${price} XLM.`
          );
        }
      } catch (err) {
        Logger.error('Error in delayed delivery simulation:', err);
      }
    }, 8000);

    res.status(201).json(newOrder);
  } catch (err: any) {
    Logger.error('Order creation error:', err);
    res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
});

// POST /orders/:id/approve (Manual approval)
app.post('/orders/:id/approve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, txSignature } = req.body;

  if (!userId || !txSignature) {
    return res.status(400).json({ message: 'userId and txSignature are required' });
  }

  const order = orders.find(o => o.id === id && o.userId === userId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (order.status !== 'pending_approval') {
    return res.status(400).json({ message: `Order status is ${order.status}, cannot approve` });
  }

  try {
    Logger.info(`[Soroban] User signed transaction approving order ${id}. Signature: ${txSignature.substring(0, 10)}...`);

    // Create & fund escrow
    const escrowRes = await fetch('http://localhost:3014/escrow/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer: userId,
        agent: order.agentId,
        merchant: order.merchantName,
        amount: parseFloat(order.price)
      })
    });

    if (!escrowRes.ok) {
      return res.status(500).json({ message: 'Failed to deploy escrow contract' });
    }

    const escrowData = await escrowRes.json();
    order.escrowAddress = escrowData.escrowAddress;
    order.status = 'escrow_funded';
    order.txHash = `stellar_tx_${Math.random().toString(36).substring(2, 12)}`;
    order.updatedAt = new Date();

    await fetch('http://localhost:3014/escrow/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escrowAddress: order.escrowAddress })
    });

    writeAuditLog(order.delegationId, order.id, 'user', 'order_approved', `User approved spend and funded Escrow ${order.escrowAddress} with signature ${txSignature.substring(0, 8)}...`);

    // Simulate completion in 8 seconds
    setTimeout(async () => {
      try {
        const orderIdx = orders.findIndex(o => o.id === id);
        if (orderIdx !== -1 && orders[orderIdx].status === 'escrow_funded') {
          orders[orderIdx].status = 'delivered';
          orders[orderIdx].updatedAt = new Date();
          writeAuditLog(order.delegationId, order.id, 'system', 'order_delivered', `Merchant delivered "${order.productDescription}"`);

          await fetch('http://localhost:3014/escrow/release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ escrowAddress: order.escrowAddress, authorizedBy: order.agentId })
          });

          orders[orderIdx].status = 'completed';
          orders[orderIdx].updatedAt = new Date();
          writeAuditLog(order.delegationId, order.id, 'agent', 'escrow_released', `Agent released ${order.price} XLM to merchant`);

          await sendNotification(
            userId,
            'Purchase Completed Successfully (Approved)',
            `Your manual purchase of "${order.productDescription}" for ${order.price} XLM has been completed.`
          );
        }
      } catch (err) {
        Logger.error('Error in delayed delivery simulation:', err);
      }
    }, 8000);

    res.json(order);
  } catch (err: any) {
    Logger.error('Order approval error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /audit-logs
app.get('/audit-logs', (req: Request, res: Response) => {
  const { delegationId } = req.query;
  if (!delegationId) {
    return res.status(400).json({ message: 'delegationId query parameter is required' });
  }

  const filteredLogs = auditLogs.filter(log => log.delegationId === delegationId);
  res.json(filteredLogs);
});

app.listen(PORT, () => {
  Logger.info(`Astraea Orchestrator service running on port ${PORT}`);
});
