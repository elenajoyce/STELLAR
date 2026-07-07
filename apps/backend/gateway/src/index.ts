import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { Logger, StellarHelper, AppError } from '@astraea/utils';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'astraea_jwt_secret_key_123';

app.use(cors());
app.use(express.json());

// In-memory challenge store (maps walletAddress -> challenge)
const challenges = new Map<string, string>();

// Simple authentication middleware
export interface AuthRequest extends Request {
  user?: {
    walletAddress: string;
  };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = { walletAddress: decoded.walletAddress };
    next();
  });
};

// Route: Get Challenge for Stellar login
app.get('/api/auth/challenge', (req: Request, res: Response) => {
  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ message: 'walletAddress query parameter is required' });
  }

  if (!StellarHelper.isValidPublicKey(walletAddress)) {
    return res.status(400).json({ message: 'Invalid Stellar public key format' });
  }

  // Create a random challenge
  const challenge = `Astraea Authentication Challenge: ${Math.random().toString(36).substring(2)}${Date.now()}`;
  challenges.set(walletAddress, challenge);

  Logger.info(`Challenge generated for wallet: ${walletAddress}`);
  res.json({ challenge });
});

// Route: Login via challenge signature verification
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { walletAddress, signature, challenge } = req.body;

  if (!walletAddress || !signature || !challenge) {
    return res.status(400).json({ message: 'walletAddress, signature, and challenge are required' });
  }

  const storedChallenge = challenges.get(walletAddress);
  if (!storedChallenge || storedChallenge !== challenge) {
    return res.status(400).json({ message: 'Invalid or expired challenge' });
  }

  // Verify the signature on Stellar
  const isValid = StellarHelper.verifySignature(challenge, signature, walletAddress);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid signature for wallet key' });
  }

  // Clean up challenge
  challenges.delete(walletAddress);

  // Generate JWT token
  const token = jwt.sign({ walletAddress }, JWT_SECRET, { expiresIn: '24h' });

  Logger.info(`Successful login for wallet: ${walletAddress}`);
  res.json({
    token,
    user: {
      id: walletAddress,
      email: `${walletAddress.substring(0, 8)}@astraea.io`,
      walletAddress,
      createdAt: new Date()
    }
  });
});

// Mock service orchestration forwarding (forwarding to Microservices)
const SERVICE_PORTS = {
  orchestrator: 3010,
  agents: 3011,
  wallet: 3012,
  payments: 3014,
  notifications: 3015
};

const forwardToService = async (serviceName: keyof typeof SERVICE_PORTS, path: string, options: RequestInit = {}) => {
  const port = SERVICE_PORTS[serviceName];
  const url = `http://localhost:${port}${path}`;
  Logger.info(`Forwarding request to ${serviceName} on ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new AppError(response.status, data.message || `Service ${serviceName} returned error`);
    }
    return data;
  } catch (error: any) {
    Logger.error(`Error forwarding request to ${serviceName}:`, error);
    throw new AppError(error.statusCode || 500, error.message || `Service ${serviceName} unavailable`);
  }
};

// Route: Get Agents
app.get('/api/agents', async (req: Request, res: Response) => {
  try {
    const agents = await forwardToService('agents', '/agents');
    res.json(agents);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// Route: Get Delegations
app.get('/api/delegations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const delegations = await forwardToService('wallet', `/delegations?userId=${walletAddress}`);
    res.json(delegations);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// Route: Create Delegation
app.post('/api/delegations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const result = await forwardToService('wallet', '/delegations', {
      method: 'POST',
      body: JSON.stringify({ ...req.body, userId: walletAddress })
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// Route: Revoke Delegation
app.delete('/api/delegations/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const result = await forwardToService('wallet', `/delegations/${req.params.id}?userId=${walletAddress}`, {
      method: 'DELETE'
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// Route: Get Orders
app.get('/api/orders', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const orders = await forwardToService('orchestrator', `/orders?userId=${walletAddress}`);
    res.json(orders);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// Route: Create Order
app.post('/api/orders', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const order = await forwardToService('orchestrator', '/orders', {
      method: 'POST',
      body: JSON.stringify({ ...req.body, userId: walletAddress })
    });
    res.status(201).json(order);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// Route: Approve Order
app.post('/api/orders/:id/approve', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const result = await forwardToService('orchestrator', `/orders/${req.params.id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ ...req.body, userId: walletAddress })
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// Route: Get Audit Logs
app.get('/api/audit-logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { delegationId } = req.query;
    if (!delegationId) {
      return res.status(400).json({ message: 'delegationId query parameter is required' });
    }
    const logs = await forwardToService('orchestrator', `/audit-logs?delegationId=${delegationId}`);
    res.json(logs);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// Route: Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  Logger.error('Unhandled error inside API gateway:', err);
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  Logger.info(`Astraea API Gateway running on port ${PORT}`);
});
