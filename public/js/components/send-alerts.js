import { api } from '../services/api.js';
import { sseClient } from '../services/sse.js';

export class SendAlerts {
  constructor() {
    this.rulesListElement = document.getElementById('rules-list');
    this.previewSection = document.getElementById('preview-section');
    this.previewContent = document.getElementById('preview-content');
    this.logsContainer = document.getElementById('logs-container');
    this.selectedRules = new Set();
  }

  async init() {
    await this.loadRules();
    this.setupEventListeners();
  }

  async loadRules() {
    try {
      const rules = await api.get('/api/rules');
      this.renderRules(rules);
    } catch (error) {
      this.rulesListElement.innerHTML = `
        <div class="collection-item center-align red-text">
          Error al cargar reglas: ${error.message}
        </div>
      `;
    }
  }

  renderRules(rules) {
    if (rules.length === 0) {
      this.rulesListElement.innerHTML = `
        <div class="collection-item center-align grey-text">
          No hay reglas configuradas
        </div>
      `;
      return;
    }

    this.rulesListElement.innerHTML = rules.map(rule => `
      <div class="collection-item rule-item">
        <label>
          <input type="checkbox" class="rule-checkbox" data-rule-id="${rule.id}" ${rule.enabled ? 'checked' : ''} ${!rule.enabled ? 'disabled' : ''}>
          <span></span>
        </label>
        <div class="rule-info" style="margin-left: 20px;">
          <div class="rule-name">${rule.name}</div>
          <div class="rule-type">${rule.type}</div>
        </div>
      </div>
    `).join('');

    this.rulesListElement.querySelectorAll('.rule-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const ruleId = e.target.dataset.ruleId;
        if (e.target.checked) {
          this.selectedRules.add(ruleId);
        } else {
          this.selectedRules.delete(ruleId);
        }
      });
    });

    this.selectedRules = new Set(rules.filter(r => r.enabled).map(r => r.id));
  }

  setupEventListeners() {
    document.getElementById('btn-preview').addEventListener('click', () => this.preview());
    document.getElementById('btn-send').addEventListener('click', () => this.send(false));
    document.getElementById('btn-dry-run').addEventListener('click', () => this.send(true));
    document.getElementById('btn-clear-logs').addEventListener('click', () => this.clearLogs());
  }

  getSelectedRuleIds() {
    return Array.from(this.selectedRules);
  }

  async preview() {
    const ruleIds = this.getSelectedRuleIds();
    if (ruleIds.length === 0) {
      M.toast({ html: 'Selecciona al menos una regla', classes: 'orange' });
      return;
    }

    this.clearLogs();
    this.addLog('info', 'Generando preview...');

    try {
      const result = await api.post('/api/preview', { ruleIds });
      this.renderPreview(result.previews);
      this.addLog('success', 'Preview generado exitosamente');
    } catch (error) {
      this.addLog('error', `Error: ${error.message}`);
    }
  }

  renderPreview(previews) {
    this.previewSection.style.display = 'block';
    
    let html = '';
    for (const preview of previews) {
      html += `<div class="preview-item">
        <h6><i class="material-icons tiny">rule</i> ${preview.ruleName}</h6>`;
      
      if (preview.alerts.length === 0) {
        html += `<p class="grey-text">No hay alertas para esta regla</p>`;
      } else {
        for (const alert of preview.alerts) {
          html += `
            <div class="recipient-info">
              <i class="material-icons tiny">person</i>
              <strong>${alert.recipientName}</strong> (${alert.recipient})
            </div>
            <div class="message-content">${this.escapeHtml(alert.message)}</div>
          `;
        }
      }
      html += `</div>`;
    }
    
    this.previewContent.innerHTML = html;
  }

  async send(dryRun) {
    const ruleIds = this.getSelectedRuleIds();
    if (ruleIds.length === 0) {
      M.toast({ html: 'Selecciona al menos una regla', classes: 'orange' });
      return;
    }

    if (!dryRun) {
      const confirmed = confirm('¿Estás seguro de que deseas enviar las alertas?');
      if (!confirmed) return;
    }

    this.clearLogs();
    this.previewSection.style.display = 'none';

    const action = dryRun ? 'Dry Run' : 'Envío';
    this.addLog('info', `Iniciando ${action}...`);

    await sseClient.connect(
      '/api/send',
      { ruleIds, dryRun },
      (log) => this.addLog(log.type, log.message, log.data),
      () => this.addLog('success', `${action} completado`)
    );
  }

  addLog(type, message, data) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    let content = `<span class="timestamp">[${timestamp}]</span>${this.escapeHtml(message)}`;
    
    if (data && data.messages) {
      content += '<div style="margin-left: 20px; margin-top: 5px;">';
      for (const msg of data.messages) {
        content += `<div style="margin-bottom: 10px;">
          <strong>${msg.rule}:</strong>
          <pre style="margin: 5px 0; white-space: pre-wrap;">${this.escapeHtml(msg.message)}</pre>
        </div>`;
      }
      content += '</div>';
    }
    
    entry.innerHTML = content;
    this.logsContainer.appendChild(entry);
    this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
  }

  clearLogs() {
    this.logsContainer.innerHTML = '';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
