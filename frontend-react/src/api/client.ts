import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export interface StatusResponse {
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_required';
  connected: boolean;
  qr?: string;
}

export interface Rule {
  id: string;
  name: string;
  type: 'simple' | 'aggregation';
  enabled: boolean;
}

export interface Executive {
  name: string;
  whatsapp: string | null;
  supervisor: string | null;
  enabled: boolean;
  configured: boolean;
}

export interface PreviewAlert {
  recipient: string;
  recipientName: string;
  message: string;
}

export interface PreviewResponse {
  ruleId: string;
  ruleName: string;
  alerts: PreviewAlert[];
}

export interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'preview';
  message: string;
  data?: unknown;
}

export interface FileInfo {
  exists: boolean;
  fileName?: string;
  size?: number;
  uploadedAt?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  columns: string[];
}

export const statusApi = {
  get: () => api.get<StatusResponse>('/status').then(r => r.data),
  logout: () => api.post<{ success: boolean; message: string }>('/status/logout').then(r => r.data),
};

export const rulesApi = {
  list: () => api.get<Rule[]>('/rules').then(r => r.data),
};

export const recipientsApi = {
  list: () => api.get('/recipients').then(r => r.data),
  executives: () => api.get('/recipients/executives').then(r => r.data),
  sync: () => api.post('/recipients/sync').then(r => r.data),
  create: (data: { name: string; whatsapp: string | null; supervisor?: string | null; enabled: boolean }) => 
    api.post('/recipients', data).then(r => r.data),
  update: (name: string, data: { whatsapp?: string | null; supervisor?: string | null; enabled?: boolean }) => 
    api.put(`/recipients/${encodeURIComponent(name)}`, data).then(r => r.data),
  delete: (name: string) => 
    api.delete(`/recipients/${encodeURIComponent(name)}`).then(r => r.data),
};

export const previewApi = {
  generate: (ruleIds: string[]) => 
    api.post<{ previews: PreviewResponse[] }>('/preview', { ruleIds }).then(r => r.data),
};

export const sendApi = {
  send: (ruleIds: string[], dryRun: boolean = false): EventSource => {
    const url = `/api/send?ruleIds=${ruleIds.join(',')}&dryRun=${dryRun}`;
    return new EventSource(url);
  },
};

export const uploadApi = {
  upload: (formData: FormData) => 
    api.post<UploadResponse>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data),
  getInfo: () => 
    api.get<FileInfo>('/upload/info').then(r => r.data),
};

export default api;
