import { Router, type Request, type Response } from 'express';
import type { WhatsAppClient } from '../services/whatsapp-client.js';

export function createStatusRouter(whatsappClient: WhatsAppClient) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const status = whatsappClient.getStatus();
    const qr = whatsappClient.getQR();
    res.json({
      status,
      connected: whatsappClient.isReady(),
      qr
    });
  });

  router.post('/logout', async (_req: Request, res: Response) => {
    try {
      await whatsappClient.logout();
      res.json({ success: true, message: 'Sesión cerrada correctamente' });
    } catch (error) {
      res.status(500).json({ error: 'Error al cerrar sesión', details: String(error) });
    }
  });

  return router;
}
