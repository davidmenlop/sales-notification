const API_BASE = '';

class ApiClient {
  async get(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error en la petición');
    }
    return response.json();
  }

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error en la petición');
    }
    return response.json();
  }

  async put(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error en la petición');
    }
    return response.json();
  }

  async delete(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error en la petición');
    }
    return response.json();
  }
}

export const api = new ApiClient();
