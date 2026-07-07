export interface User {
  id: string;
  email: string;
  walletAddress: string;
  createdAt: Date;
}

export type AgentStatus = 'active' | 'idle' | 'error' | 'offline';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  capabilities: string[];
  description: string;
  createdAt: Date;
}

export type DelegationStatus = 'active' | 'revoked' | 'expired';

export interface Delegation {
  id: string;
  userId: string;
  agentId: string;
  status: DelegationStatus;
  spendLimit: string; // XLM or USD (as string to avoid floats)
  spentAmount: string;
  approvalThreshold: string;
  escrowAddress?: string;
  expiresAt: Date;
  createdAt: Date;
}

export type OrderStatus =
  | 'pending_approval'
  | 'funding_escrow'
  | 'escrow_funded'
  | 'processing'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  agentId: string;
  delegationId: string;
  status: OrderStatus;
  merchantName: string;
  productDescription: string;
  price: string; // XLM or USD
  escrowAddress?: string;
  txHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  delegationId: string;
  orderId?: string;
  actor: 'agent' | 'user' | 'system';
  action: string;
  details: string;
  txHash?: string;
  createdAt: Date;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}
