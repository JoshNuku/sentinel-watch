import { Request, Response, NextFunction } from 'express';

const EDGE_API_KEY = process.env.EDGE_API_KEY || 'orion-edge-key-dev';

export const verifyApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    res.status(401).json({ success: false, message: 'Edge API key required' });
    return;
  }

  if (apiKey !== EDGE_API_KEY) {
    res.status(403).json({ success: false, message: 'Invalid Edge API key' });
    return;
  }

  next();
};
