import { User, Agent, Delegation, Order, AuditLog } from '@astraea/types';

export class AstraeaClient {
  private token: string | null = null;

  constructor(private gatewayUrl: string = 'http://localhost:3000') {}

  setAuthToken(token: string) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(`${this.gatewayUrl}${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || `Request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async login(walletAddress: string, signature: string, challenge: string): Promise<{ token: string; user: User }> {
    return this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature, challenge })
    });
  }

  async getChallenge(walletAddress: string): Promise<{ challenge: string }> {
    return this.request<{ challenge: string }>(`/api/auth/challenge?walletAddress=${encodeURIComponent(walletAddress)}`);
  }

  async getAgents(): Promise<Agent[]> {
    return this.request<Agent[]>('/api/agents');
  }

  async getDelegations(): Promise<Delegation[]> {
    return this.request<Delegation[]>('/api/delegations');
  }

  async createDelegation(data: {
    agentId: string;
    spendLimit: string;
    approvalThreshold: string;
    expiresAt: string;
  }): Promise<Delegation> {
    return this.request<Delegation>('/api/delegations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async revokeDelegation(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/delegations/${id}`, {
      method: 'DELETE'
    });
  }

  async getOrders(): Promise<Order[]> {
    return this.request<Order[]>('/api/orders');
  }

  async createOrder(data: {
    delegationId: string;
    merchantName: string;
    productDescription: string;
    price: string;
  }): Promise<Order> {
    return this.request<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async approveOrder(orderId: string, txSignature: string): Promise<Order> {
    return this.request<Order>(`/api/orders/${orderId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ txSignature })
    });
  }

  async getAuditLogs(delegationId: string): Promise<AuditLog[]> {
    return this.request<AuditLog[]>(`/api/audit-logs?delegationId=${encodeURIComponent(delegationId)}`);
  }
}
