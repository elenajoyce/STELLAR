import express, { Request, Response } from 'express';
import cors from 'cors';
import { Logger } from '@astraea/utils';
import { Agent } from '@astraea/types';

const app = express();
const PORT = process.env.PORT || 3011;

app.use(cors());
app.use(express.json());

const AGENTS: Agent[] = [
  {
    id: 'agent_procurement_1',
    name: 'Astraea Procurement Agent',
    status: 'active',
    capabilities: ['retail_shopping', 'deals_finding', 'order_management'],
    description: 'Finds the best deals on physical electronics, hardware, and developer gear.',
    createdAt: new Date('2026-01-01')
  },
  {
    id: 'agent_travel_2',
    name: 'Lumen Travel Agent',
    status: 'active',
    capabilities: ['flight_booking', 'hotel_reservations', 'itinerary_planning'],
    description: 'Arranges dynamic business travel itineraries, flights, and accommodations.',
    createdAt: new Date('2026-02-01')
  },
  {
    id: 'agent_digital_3',
    name: 'Soroban Smart Buyer',
    status: 'active',
    capabilities: ['saas_subscriptions', 'api_credits', 'digital_services'],
    description: 'Manages ongoing digital software subscriptions, API credit top-ups, and cloud hosting.',
    createdAt: new Date('2026-03-01')
  }
];

// Get list of agents
app.get('/agents', (req: Request, res: Response) => {
  res.json(AGENTS);
});

// Run agent execution (simulation)
app.post('/execute', (req: Request, res: Response) => {
  const { agentId, prompt, delegationId, spendLimit } = req.body;

  if (!agentId || !prompt || !delegationId) {
    return res.status(400).json({ message: 'agentId, prompt, and delegationId are required' });
  }

  const agent = AGENTS.find(a => a.id === agentId);
  if (!agent) {
    return res.status(404).json({ message: 'Agent not found' });
  }

  Logger.info(`Executing agent ${agentId} with prompt: "${prompt}"`);

  // Simulate AI parsing prompt and finding item to buy
  // E.g. prompt: "Buy a keyboard for under 150 XLM"
  let merchantName = 'Global Dev Gear';
  let productDescription = 'Mechanical Developer Keyboard (TKL)';
  let price = '120'; // XLM/USD

  if (prompt.toLowerCase().includes('flight') || prompt.toLowerCase().includes('hotel')) {
    merchantName = 'SkyLine Airways';
    productDescription = 'One-way Economy Flight (SFO -> NYC)';
    price = '350';
  } else if (prompt.toLowerCase().includes('subscription') || prompt.toLowerCase().includes('openai') || prompt.toLowerCase().includes('api')) {
    merchantName = 'OpenAI API Credits';
    productDescription = 'API Developer Platform Credits';
    price = '50';
  }

  // Check if exceeds delegation spend limit if provided
  if (spendLimit && parseFloat(price) > parseFloat(spendLimit)) {
    Logger.warn(`Agent determined purchase cost (${price}) exceeds delegation spend limit (${spendLimit})`);
    return res.status(400).json({
      message: `Failed: Agent determined purchase price (${price}) exceeds delegation spend limit (${spendLimit})`
    });
  }

  // Return generated order draft details
  res.json({
    success: true,
    agentId,
    merchantName,
    productDescription,
    price,
    confidence: 0.96,
    recommendation: `Found suitable ${productDescription} at ${merchantName} for ${price} XLM.`
  });
});

app.listen(PORT, () => {
  Logger.info(`Astraea Agents service running on port ${PORT}`);
});
