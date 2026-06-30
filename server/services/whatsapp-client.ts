import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason,
  type WASocket,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import * as path from 'path';
import * as fs from 'fs';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'qr_required';

export interface WhatsAppClientOptions {
  sessionPath: string;
  onConnectionUpdate?: (status: ConnectionStatus) => void;
  onQR?: (qr: string) => void;
  logger?: (msg: string) => void;
}

export class WhatsAppClient {
  private sock: WASocket | null = null;
  private sessionPath: string;
  private status: ConnectionStatus = 'disconnected';
  private currentQR: string | null = null;
  private onConnectionUpdate?: (status: ConnectionStatus) => void;
  private onQR?: (qr: string) => void;
  private logger: (msg: string) => void;
  private reconnecting = false;

  constructor(options: WhatsAppClientOptions) {
    this.sessionPath = options.sessionPath;
    this.onConnectionUpdate = options.onConnectionUpdate;
    this.onQR = options.onQR;
    this.logger = options.logger || console.log;

    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
  }

  async connect(): Promise<void> {
    if (this.sock) {
      this.logger('Ya existe una conexión activa');
      return;
    }

    this.setStatus('connecting');
    this.logger('Iniciando conexión con WhatsApp...');

    const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
    const { version } = await fetchLatestBaileysVersion();
    
    this.logger(`Usando Baileys version: ${version.join('.')}`);

    this.sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Sales Notification', 'Chrome', '120.0.0.0'],
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      markOnlineOnConnect: true
    });

    const sock = this.sock;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      this.logger(`Connection update: connection=${connection}, qr=${qr ? 'present' : 'none'}, lastDisconnect=${lastDisconnect ? 'yes' : 'no'}`);

      if (qr) {
        this.currentQR = qr;
        this.setStatus('qr_required');
        this.logger('QR generado, esperando escaneo...');
        if (this.onQR) {
          this.onQR(qr);
        }
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error as any;
        const statusCode = error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.logger(`Conexión cerrada. StatusCode: ${statusCode}, shouldReconnect: ${shouldReconnect}, error: ${error?.message || 'none'}`);

        if (shouldReconnect && !this.reconnecting) {
          this.reconnecting = true;
          this.logger('Reconectando en 5 segundos...');
          this.sock = null;
          
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          await this.connect();
          this.reconnecting = false;
        } else {
          this.setStatus('disconnected');
          this.logger('Conexión cerrada permanentemente');
        }
      } else if (connection === 'open') {
        this.currentQR = null;
        this.setStatus('connected');
        this.logger('WhatsApp conectado exitosamente');
      }
    });

    sock.ev.on('creds.update', saveCreds);
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    if (this.onConnectionUpdate) {
      this.onConnectionUpdate(status);
    }
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getQR(): string | null {
    return this.currentQR;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.sock || this.status !== 'connected') {
      throw new Error('WhatsApp no está conectado');
    }

    try {
      let jid: string;
      
      if (phoneNumber.includes('@g.us') || phoneNumber.includes('@s.whatsapp.net')) {
        jid = phoneNumber;
      } else {
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        jid = `${cleanNumber}@s.whatsapp.net`;
      }

      await this.sock.sendMessage(jid, { text: message });
      return true;
    } catch (error) {
      this.logger(`Error enviando mensaje a ${phoneNumber}: ${error}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.sock) {
      this.sock.end(undefined);
      this.sock = null;
      this.setStatus('disconnected');
    }
  }

  async logout(): Promise<void> {
    this.logger('Cerrando sesión de WhatsApp...');
    
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (error) {
        this.logger(`Error al hacer logout: ${error}`);
      }
      this.sock = null;
    }

    this.currentQR = null;
    this.setStatus('disconnected');

    const files = fs.readdirSync(this.sessionPath);
    for (const file of files) {
      fs.unlinkSync(path.join(this.sessionPath, file));
    }

    this.logger('Sesión cerrada, reconectando...');
    await this.connect();
  }

  isReady(): boolean {
    return this.status === 'connected' && this.sock !== null;
  }
}
