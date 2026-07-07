import express, { Request, Response } from 'express';
import cors from 'cors';
import { Logger } from '@astraea/utils';

const app = express();
const PORT = process.env.PORT || 3015;

app.use(cors());
app.use(express.json());

// Send notification
app.post('/notify', (req: Request, res: Response) => {
  const { userId, type, title, message } = req.body;

  if (!userId || !type || !title || !message) {
    return res.status(400).json({ message: 'userId, type, title, and message are required' });
  }

  Logger.info(`[Notification Service] Sending ${type.toUpperCase()} notification to user ${userId}`);
  Logger.info(`[Notification] TITLE: ${title}`);
  Logger.info(`[Notification] MESSAGE: ${message}`);

  res.json({
    success: true,
    sentAt: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  Logger.info(`Astraea Notifications service running on port ${PORT}`);
});
