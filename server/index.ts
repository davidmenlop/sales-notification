import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import qrcode from 'qrcode-terminal';
import { WhatsAppClient } from './services/whatsapp-client.js';
import { rulesRouter } from './routes/rules.js';
import { recipientsRouter } from './routes/recipients.js';
import { previewRouter } from './routes/preview.js';
import { createSendRouter } from './routes/send.js';
import { createStatusRouter } from './routes/status.js';

const PORT = process.env.PORT || 3000;
const SESSION_PATH = path.join(process.cwd(), 'sessions');

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());

const whatsappClient = new WhatsAppClient({
  sessionPath: SESSION_PATH,
  onConnectionUpdate: (status) => {
    console.log(`[WhatsApp] Estado: ${status}`);
  },
  onQR: (qr) => {
    console.log('\n========================================');
    console.log('  Escanea este código QR con WhatsApp');
    console.log('========================================\n');
    qrcode.generate(qr, { small: true });
    console.log('\n');
  },
  logger: (msg) => {
    console.log(`[WhatsApp] ${msg}`);
  }
});

app.use('/api/rules', rulesRouter);
app.use('/api/recipients', recipientsRouter);
app.use('/api/preview', previewRouter);
app.use('/api/send', createSendRouter(whatsappClient));
app.use('/api/status', createStatusRouter(whatsappClient));

const frontendPath = path.join(process.cwd(), 'frontend-react', 'dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ message: 'Frontend no construido. Ejecuta: cd frontend-react && npm run build' });
  });
}

async function start() {
  console.log('\n🚀 Iniciando Sales Notification System...\n');

  await whatsappClient.connect();

  app.listen(PORT, () => {
    console.log(`\n📊 Servidor iniciado en http://localhost:${PORT}\n`);
  });
}

start().catch(console.error);
