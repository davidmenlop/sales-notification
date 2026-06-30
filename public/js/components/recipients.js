import { api } from '../services/api.js';

export class Recipients {
  constructor() {
    this.tbody = document.getElementById('recipients-tbody');
    this.modal = null;
    this.editingName = null;
  }

  async init() {
    this.modal = M.Modal.init(document.getElementById('modal-recipient'));
    await this.loadRecipients();
    this.setupEventListeners();
  }

  async loadRecipients() {
    try {
      const executives = await api.get('/api/recipients/executives');
      this.renderRecipients(executives);
    } catch (error) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="4" class="center-align red-text">
            Error al cargar destinatarios: ${error.message}
          </td>
        </tr>
      `;
    }
  }

  renderRecipients(executives) {
    if (executives.length === 0) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="4" class="center-align grey-text">
            No hay ejecutivos. Sincroniza desde Excel o agrega manualmente.
          </td>
        </tr>
      `;
      return;
    }

    this.tbody.innerHTML = executives.map(exec => `
      <tr>
        <td>${exec.name}</td>
        <td>${exec.whatsapp || '<span class="grey-text">No configurado</span>'}</td>
        <td>
          <span class="recipient-status ${exec.configured ? 'configured' : 'not-configured'}">
            <i class="material-icons tiny">${exec.configured ? 'check_circle' : 'warning'}</i>
            ${exec.configured ? 'Configurado' : 'Sin número'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-small blue waves-effect edit-btn" data-name="${exec.name}" data-whatsapp="${exec.whatsapp || ''}">
              <i class="material-icons">edit</i>
            </button>
            <button class="btn-small red waves-effect delete-btn" data-name="${exec.name}">
              <i class="material-icons">delete</i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    this.tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const name = e.currentTarget.dataset.name;
        const whatsapp = e.currentTarget.dataset.whatsapp;
        this.openEditModal(name, whatsapp);
      });
    });

    this.tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const name = e.currentTarget.dataset.name;
        if (confirm(`¿Eliminar a ${name}?`)) {
          await this.deleteRecipient(name);
        }
      });
    });
  }

  setupEventListeners() {
    document.getElementById('btn-sync').addEventListener('click', () => this.syncFromExcel());
    document.getElementById('btn-add-recipient').addEventListener('click', () => this.openAddModal());
    document.getElementById('btn-save-recipient').addEventListener('click', () => this.saveRecipient());
  }

  openAddModal() {
    this.editingName = null;
    document.getElementById('modal-recipient-title').textContent = 'Agregar Destinatario';
    document.getElementById('recipient-name').value = '';
    document.getElementById('recipient-name').disabled = false;
    document.getElementById('recipient-whatsapp').value = '';
    document.getElementById('recipient-enabled').checked = true;
    M.updateTextFields();
    this.modal.open();
  }

  openEditModal(name, whatsapp) {
    this.editingName = name;
    document.getElementById('modal-recipient-title').textContent = 'Editar Destinatario';
    document.getElementById('recipient-name').value = name;
    document.getElementById('recipient-name').disabled = true;
    document.getElementById('recipient-whatsapp').value = whatsapp;
    document.getElementById('recipient-enabled').checked = true;
    M.updateTextFields();
    this.modal.open();
  }

  async saveRecipient() {
    const name = document.getElementById('recipient-name').value.trim();
    const whatsapp = document.getElementById('recipient-whatsapp').value.trim();
    const enabled = document.getElementById('recipient-enabled').checked;

    if (!name) {
      M.toast({ html: 'El nombre es requerido', classes: 'red' });
      return;
    }

    try {
      if (this.editingName) {
        await api.put(`/api/recipients/${encodeURIComponent(this.editingName)}`, {
          whatsapp: whatsapp || null,
          enabled
        });
        M.toast({ html: 'Destinatario actualizado', classes: 'green' });
      } else {
        await api.post('/api/recipients', { name, whatsapp: whatsapp || null, enabled });
        M.toast({ html: 'Destinatario creado', classes: 'green' });
      }
      
      this.modal.close();
      await this.loadRecipients();
    } catch (error) {
      M.toast({ html: `Error: ${error.message}`, classes: 'red' });
    }
  }

  async deleteRecipient(name) {
    try {
      await api.delete(`/api/recipients/${encodeURIComponent(name)}`);
      M.toast({ html: 'Destinatario eliminado', classes: 'green' });
      await this.loadRecipients();
    } catch (error) {
      M.toast({ html: `Error: ${error.message}`, classes: 'red' });
    }
  }

  async syncFromExcel() {
    try {
      M.toast({ html: 'Sincronizando...', classes: 'blue' });
      const result = await api.post('/api/recipients/sync');
      M.toast({ html: result.message, classes: 'green' });
      await this.loadRecipients();
    } catch (error) {
      M.toast({ html: `Error: ${error.message}`, classes: 'red' });
    }
  }
}
