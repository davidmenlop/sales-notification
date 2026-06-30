class SSEClient {
  constructor() {
    this.abortController = null;
  }

  async connect(endpoint, data, onMessage, onDone) {
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: this.abortController.signal
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '{}') continue;
            try {
              const logData = JSON.parse(jsonStr);
              onMessage(logData);
            } catch (e) {
              // ignore parse errors
            }
          } else if (line.startsWith('event: done')) {
            if (onDone) onDone();
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        onMessage({
          type: 'error',
          message: `Error de conexión: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  disconnect() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const sseClient = new SSEClient();
