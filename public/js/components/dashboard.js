import { api } from '../services/api.js';

export class Dashboard {
  constructor() {
    this.statusElement = document.getElementById('connection-status');
    this.statusDetailElement = document.getElementById('wa-status-text');
    this.statusLoader = document.getElementById('wa-status-loader');
    this.rulesCountElement = document.getElementById('rules-count');
    this.recipientsCountElement = document.getElementById('recipients-count');
    this.qrSection = document.getElementById('qr-section');
    this.qrcodeContainer = document.getElementById('qrcode');
    this.qrCode = null;
    this.lastQR = null;
  }

  async init() {
    await this.checkWhatsAppStatus();
    await this.loadStats();
    
    setInterval(() => this.checkWhatsAppStatus(), 5000);
  }

  async checkWhatsAppStatus() {
    try {
      const status = await api.get('/api/status');
      this.updateStatus(status.status, status.connected, status.qr);
    } catch (error) {
      this.updateStatus('disconnected', false, null);
    }
  }

  updateStatus(status, connected, qr) {
    const statusMap = {
      connected: { class: 'connected', icon: 'wifi', text: 'Conectado' },
      connecting: { class: 'connecting', icon: 'wifi_lock', text: 'Conectando...' },
      qr_required: { class: 'qr_required', icon: 'qr_code', text: 'Escanear QR' },
      disconnected: { class: 'disconnected', icon: 'wifi_off', text: 'Desconectado' }
    };

    const info = statusMap[status] || statusMap.disconnected;
    
    this.statusElement.className = `status-badge ${info.class}`;
    this.statusElement.innerHTML = `<i class="material-icons tiny">${info.icon}</i>${info.text}`;

    if (this.statusDetailElement) {
      this.statusDetailElement.textContent = info.text;
    }
    if (this.statusLoader) {
      this.statusLoader.style.display = status === 'connecting' ? 'block' : 'none';
    }

    if (status === 'qr_required' && qr) {
      this.showQR(qr);
    } else {
      this.hideQR();
    }
  }

  showQR(qr) {
    if (this.qrSection) {
      this.qrSection.style.display = 'block';
    }

    if (this.lastQR === qr) {
      return;
    }

    this.lastQR = qr;

    if (this.qrcodeContainer) {
      this.qrcodeContainer.innerHTML = '';
      this.qrCode = new QRCode(this.qrcodeContainer, {
        text: qr,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
      });
    }
  }

  hideQR() {
    if (this.qrSection) {
      this.qrSection.style.display = 'none';
    }
    this.lastQR = null;
    if (this.qrcodeContainer) {
      this.qrcodeContainer.innerHTML = '';
    }
  }

  async loadStats() {
    try {
      const [rules, recipients] = await Promise.all([
        api.get('/api/rules'),
        api.get('/api/recipients')
      ]);

      this.rulesCountElement.textContent = rules.filter(r => r.enabled).length;
      
      const executivesCount = Object.keys(recipients.executives || {}).length;
      this.recipientsCountElement.textContent = executivesCount;
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }
}
