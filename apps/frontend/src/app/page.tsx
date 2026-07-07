'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge } from '@astraea/ui';
import { Agent, Delegation, Order, AuditLog } from '@astraea/types';
import { 
  Wallet, 
  Bot, 
  ShieldCheck, 
  Clock, 
  Coins, 
  Send, 
  Terminal, 
  History, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';

export default function Dashboard() {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('1500.00');

  // Business state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Delegation Form State
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [spendLimit, setSpendLimit] = useState('500');
  const [approvalThreshold, setApprovalThreshold] = useState('100');
  const [expiresAt, setExpiresAt] = useState('2026-12-31');

  // Agent Console State
  const [selectedDelegationId, setSelectedDelegationId] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<{ time: string; msg: string; type: 'info' | 'warn' | 'success' }[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [pendingApprovalOrder, setPendingApprovalOrder] = useState<Order | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Initialize and Fetch data
  useEffect(() => {
    // Scroll console to bottom
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const connectWallet = async () => {
    // Generate a mock Stellar public key for client connection
    const mockAddr = 'GD3K7W4JMQM3G72XNQL7EPZ4FCD7NVEXUFLTXF7T6P7KCSJ6Q3QZ2LUO';
    setWalletAddress(mockAddr);
    setIsConnected(true);
    addConsoleLog('Wallet connected successfully: ' + mockAddr.substring(0, 10) + '...', 'success');

    // Fetch details
    fetchAgents();
    fetchDelegations(mockAddr);
    fetchOrders(mockAddr);
  };

  const addConsoleLog = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev, { time, msg, type }]);
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      } else {
        throw new Error();
      }
    } catch {
      // Fallback mocks if backend not running
      setAgents([
        {
          id: 'agent_procurement_1',
          name: 'Astraea Procurement Agent',
          status: 'active',
          capabilities: ['retail_shopping', 'deals_finding', 'order_management'],
          description: 'Finds the best deals on physical electronics, hardware, and developer gear.',
          createdAt: new Date()
        },
        {
          id: 'agent_travel_2',
          name: 'Lumen Travel Agent',
          status: 'active',
          capabilities: ['flight_booking', 'hotel_reservations', 'itinerary_planning'],
          description: 'Arranges business travel itineraries, flights, and accommodations.',
          createdAt: new Date()
        },
        {
          id: 'agent_digital_3',
          name: 'Soroban Smart Buyer',
          status: 'active',
          capabilities: ['saas_subscriptions', 'api_credits', 'digital_services'],
          description: 'Manages digital software subscriptions, API credit top-ups, and cloud hosting.',
          createdAt: new Date()
        }
      ]);
    }
  };

  const fetchDelegations = async (addr: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/delegations?userId=${addr}`);
      if (res.ok) {
        const data = await res.json();
        setDelegations(data);
      }
    } catch {
      // Fallback mock
      setDelegations([]);
    }
  };

  const fetchOrders = async (addr: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/orders?userId=${addr}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch {
      setOrders([]);
    }
  };

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return alert('Please select an agent');

    const bodyData = {
      agentId: selectedAgentId,
      spendLimit,
      approvalThreshold,
      expiresAt: new Date(expiresAt).toISOString()
    };

    try {
      const res = await fetch('http://localhost:3000/api/delegations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify(bodyData)
      });
      if (res.ok) {
        const newDel = await res.json();
        setDelegations(prev => [newDel, ...prev]);
        addConsoleLog(`[Soroban] Created permissions contract. Delegated limit ${spendLimit} XLM`, 'success');
      } else {
        throw new Error();
      }
    } catch {
      // Fallback mock creation
      const mockDel: Delegation = {
        id: `del_${Math.random().toString(36).substring(2, 8)}`,
        userId: walletAddress,
        agentId: selectedAgentId,
        status: 'active',
        spendLimit,
        spentAmount: '0',
        approvalThreshold,
        expiresAt: new Date(expiresAt),
        createdAt: new Date(),
        escrowAddress: `escrow_mock_${Math.random().toString(36).substring(2, 8)}`
      };
      setDelegations(prev => [mockDel, ...prev]);
      addConsoleLog(`[Local Simulation] Deployed Permissions contract to Soroban. Limit: ${spendLimit} XLM`, 'success');
    }
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelegationId || !promptInput) return;

    setIsAgentRunning(true);
    setPendingApprovalOrder(null);
    setConsoleLogs([]);

    const delegation = delegations.find(d => d.id === selectedDelegationId);
    if (!delegation) return;

    const agent = agents.find(a => a.id === delegation.agentId);
    const agentName = agent?.name || 'Agent';

    addConsoleLog(`[${agentName}] Booting agent workspace...`, 'info');

    // Simulate Agent Step-by-Step execution
    setTimeout(() => {
      addConsoleLog(`[${agentName}] Analyzing query: "${promptInput}"`, 'info');
    }, 1000);

    setTimeout(() => {
      addConsoleLog(`[${agentName}] Performing internet search for merchants and pricing...`, 'info');
    }, 2500);

    setTimeout(async () => {
      // Create Order draft
      try {
        const res = await fetch('http://localhost:3000/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock'
          },
          body: JSON.stringify({
            userId: walletAddress,
            delegationId: selectedDelegationId,
            prompt: promptInput
          })
        });

        if (res.ok) {
          const order: Order = await res.json();
          setOrders(prev => [order, ...prev]);
          
          addConsoleLog(`[${agentName}] Found product matching criteria: "${order.productDescription}" at "${order.merchantName}" for ${order.price} XLM.`, 'info');

          if (order.status === 'pending_approval') {
            addConsoleLog(`[Soroban] Spend amount (${order.price} XLM) exceeds auto-approval threshold (${delegation.approvalThreshold} XLM). Manual signature required.`, 'warn');
            setPendingApprovalOrder(order);
            setIsAgentRunning(false);
          } else {
            addConsoleLog(`[Soroban] Spend approved. Escrow deployed at ${order.escrowAddress}. Funds locked.`, 'success');
            // Deduct balance locally for visual effect
            setBalance(prev => (parseFloat(prev) - parseFloat(order.price)).toFixed(2));
            setIsAgentRunning(false);
            
            // Poll for order completion
            setTimeout(() => {
              addConsoleLog(`[System] Escrow release triggered by Agent. Funds disbursed to Merchant.`, 'success');
              fetchOrders(walletAddress);
            }, 8000);
          }
        } else {
          const err = await res.json();
          addConsoleLog(`[Error] ${err.message}`, 'warn');
          setIsAgentRunning(false);
        }
      } catch {
        // Fallback offline simulation
        let price = '120';
        let merchant = 'Global Dev Gear';
        let item = 'Mechanical Developer Keyboard (TKL)';

        if (promptInput.toLowerCase().includes('flight')) {
          price = '350';
          merchant = 'SkyLine Airways';
          item = 'Economy Flight SFO -> NYC';
        }

        const isOver = parseFloat(price) >= parseFloat(delegation.approvalThreshold);

        const mockOrder: Order = {
          id: `ord_${Math.random().toString(36).substring(2, 8)}`,
          userId: walletAddress,
          agentId: delegation.agentId,
          delegationId: delegation.id,
          status: isOver ? 'pending_approval' : 'completed',
          merchantName: merchant,
          productDescription: item,
          price,
          escrowAddress: delegation.escrowAddress,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        setOrders(prev => [mockOrder, ...prev]);
        addConsoleLog(`[Offline Mode] Proposed "${item}" at "${merchant}" for ${price} XLM.`, 'info');

        if (isOver) {
          addConsoleLog(`[Offline Mode] Exceeds auto-approval limit of ${delegation.approvalThreshold} XLM. Awaiting user signature...`, 'warn');
          setPendingApprovalOrder(mockOrder);
        } else {
          addConsoleLog(`[Offline Mode] Auto-approved spending on Soroban. Escrow funded.`, 'success');
          setBalance(prev => (parseFloat(prev) - parseFloat(price)).toFixed(2));
        }
        setIsAgentRunning(false);
      }
    }, 4500);
  };

  const handleApproveOrder = async () => {
    if (!pendingApprovalOrder) return;
    const orderId = pendingApprovalOrder.id;

    addConsoleLog(`[Wallet] Signing transaction to approve escrow deposit...`, 'info');

    try {
      const res = await fetch(`http://localhost:3000/api/orders/${orderId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock'
        },
        body: JSON.stringify({
          userId: walletAddress,
          txSignature: 'stellar_signature_mock_12345abcdef'
        })
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        addConsoleLog(`[Soroban] Escrow contract funded on-chain! Transaction confirmed.`, 'success');
        setBalance(prev => (parseFloat(prev) - parseFloat(pendingApprovalOrder.price)).toFixed(2));
        setPendingApprovalOrder(null);
        
        // Sim completion
        setTimeout(() => {
          addConsoleLog(`[System] Merchant completed delivery. Escrow funds released.`, 'success');
          fetchOrders(walletAddress);
        }, 8000);
      } else {
        throw new Error();
      }
    } catch {
      // Local fallback
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
      addConsoleLog(`[Offline Mode] User signature confirmed. Escrow funded and released.`, 'success');
      setBalance(prev => (parseFloat(prev) - parseFloat(pendingApprovalOrder.price)).toFixed(2));
      setPendingApprovalOrder(null);
    }
  };

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo-container">
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem',
            color: '#0B0F19'
          }}>A</div>
          <span className="logo-text">Astraea</span>
        </div>
        <div>
          {isConnected ? (
            <div className="wallet-badge wallet-badge-connected">
              <ShieldCheck size={16} />
              <span>{walletAddress.substring(0, 6)}...{walletAddress.substring(52)}</span>
            </div>
          ) : (
            <Button onClick={connectWallet}>
              <Wallet size={16} />
              Connect Stellar Wallet
            </Button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="container">
        {!isConnected ? (
          <div className="hero">
            <h1>AI-Powered Delegated Commerce on Stellar</h1>
            <p>
              Safely delegate shopping and payments to AI agents. Set custom spending thresholds and keep absolute cryptographic control using Soroban smart escrow contracts.
            </p>
            <Button onClick={connectWallet} style={{ fontSize: '1.1rem', padding: '0.8rem 1.8rem' }}>
              Launch Astraea Dashboard
            </Button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {/* Left Column - Main Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Wallet Status and Funds */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>STellar Wallet Balance</h3>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Coins size={32} style={{ color: 'var(--accent-primary)' }} />
                      {balance} <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: 400 }}>XLM</span>
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Stellar Testnet Account</span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
                      Active Network
                    </p>
                  </div>
                </div>
              </Card>

              {/* Set up Delegation */}
              <Card>
                <h3 className="section-title">
                  <Bot size={20} />
                  Delegate Authority to AI Agent
                </h3>
                <form onSubmit={handleCreateDelegation}>
                  <div className="form-group">
                    <label>Select AI Agent</label>
                    <select 
                      className="form-control" 
                      value={selectedAgentId} 
                      onChange={e => setSelectedAgentId(e.target.value)}
                    >
                      <option value="">-- Choose Agent --</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Total Spend Limit (XLM)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={spendLimit}
                        onChange={e => setSpendLimit(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Auto-Approval Threshold (XLM)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={approvalThreshold}
                        onChange={e => setApprovalThreshold(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Delegation Expiry DateLabel</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={expiresAt}
                      onChange={e => setExpiresAt(e.target.value)}
                    />
                  </div>
                  <Button type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
                    Deploy Soroban Delegation Contract
                  </Button>
                </form>
              </Card>

              {/* Run Agent Console */}
              <Card>
                <h3 className="section-title">
                  <Terminal size={20} />
                  Agent Command Console
                </h3>
                <form onSubmit={handleRunAgent} style={{ display: 'flex', gap: '0.75rem' }}>
                  <select
                    className="form-control"
                    style={{ width: '40%' }}
                    value={selectedDelegationId}
                    onChange={e => setSelectedDelegationId(e.target.value)}
                  >
                    <option value="">-- Active Delegation --</option>
                    {delegations.filter(d => d.status === 'active').map(d => {
                      const ag = agents.find(a => a.id === d.agentId);
                      return (
                        <option key={d.id} value={d.id}>{ag ? ag.name : d.id}</option>
                      );
                    })}
                  </select>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Buy a mechanical keyboard under 150 XLM..."
                    value={promptInput}
                    onChange={e => setPromptInput(e.target.value)}
                    disabled={isAgentRunning}
                  />
                  <Button type="submit" disabled={isAgentRunning || !selectedDelegationId}>
                    <Send size={16} />
                    Run
                  </Button>
                </form>

                {/* Console Logs Terminal */}
                {(consoleLogs.length > 0 || isAgentRunning) && (
                  <div className="agent-console">
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Terminal size={14} /> Agent Executing Status
                    </h4>
                    <div className="console-output">
                      {consoleLogs.map((log, idx) => (
                        <div key={idx} className="console-line" style={{
                          color: log.type === 'success' ? '#10B981' : log.type === 'warn' ? '#F59E0B' : '#E2E8F0'
                        }}>
                          <span className="console-timestamp">[{log.time}]</span>
                          <span>{log.msg}</span>
                        </div>
                      ))}
                      {isAgentRunning && (
                        <div className="console-line" style={{ color: 'var(--text-secondary)' }}>
                          <span className="console-timestamp">[{new Date().toLocaleTimeString()}]</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            Agent thinking
                            <span className="dot-flashing">...</span>
                          </span>
                        </div>
                      )}
                      <div ref={consoleEndRef} />
                    </div>

                    {pendingApprovalOrder && (
                      <div style={{ marginTop: '1.2rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h5 style={{ color: 'var(--warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <AlertTriangle size={16} />
                            Signature Required
                          </h5>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            Confirm transaction for {pendingApprovalOrder.price} XLM to merchant "{pendingApprovalOrder.merchantName}".
                          </p>
                        </div>
                        <Button variant="primary" onClick={handleApproveOrder}>
                          Sign & Fund Escrow
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column - Side Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Active Delegations List */}
              <Card>
                <h3 className="section-title">
                  <ShieldCheck size={20} />
                  Active Delegations
                </h3>
                {delegations.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                    No delegations deployed on-chain yet.
                  </p>
                ) : (
                  <div className="list-container">
                    {delegations.map(d => {
                      const agent = agents.find(a => a.id === d.agentId);
                      return (
                        <div key={d.id} className="item-row">
                          <div className="item-info">
                            <span className="item-title">{agent ? agent.name : 'Unknown Agent'}</span>
                            <span className="item-desc" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.1rem' }}>
                              <Clock size={12} /> Limit: {d.spendLimit} XLM | Threshold: {d.approvalThreshold} XLM
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Expires: {new Date(d.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <Badge type={d.status === 'active' ? 'success' : 'danger'}>
                              {d.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Delegated Order History */}
              <Card>
                <h3 className="section-title">
                  <History size={20} />
                  Recent Delegated Orders
                </h3>
                {orders.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                    No purchases recorded yet.
                  </p>
                ) : (
                  <div className="list-container">
                    {orders.map(o => (
                      <div key={o.id} className="item-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{o.productDescription}</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{o.price} XLM</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span>Merchant: {o.merchantName}</span>
                          <Badge type={
                            o.status === 'completed' ? 'success' : 
                            o.status === 'pending_approval' ? 'warning' : 'info'
                          }>
                            {o.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {o.escrowAddress && (
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', wordBreak: 'break-all', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.3rem', marginTop: '0.2rem' }}>
                            Escrow: {o.escrowAddress}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

