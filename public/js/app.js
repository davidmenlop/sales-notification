import { Dashboard } from './components/dashboard.js';
import { SendAlerts } from './components/send-alerts.js';
import { Recipients } from './components/recipients.js';

class App {
  constructor() {
    this.dashboard = new Dashboard();
    this.sendAlerts = new SendAlerts();
    this.recipients = new Recipients();
  }

  async init() {
    M.Tabs.init(document.querySelectorAll('.tabs'), {
      onShow: (tab) => {
        if (tab.id === 'dashboard') {
          this.dashboard.loadStats();
        } else if (tab.id === 'recipients') {
          this.recipients.loadRecipients();
        }
      }
    });

    await this.dashboard.init();
    await this.sendAlerts.init();
    await this.recipients.init();

    console.log('Sales Notification System initialized');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(console.error);
});
