type MessageHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private userId: number | null = null;

  connect(userId: number) {
    const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';

    this.userId = userId;
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;

      // Authenticate
      this.send('authenticate', { userId });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const handlers = this.handlers.get(message.type);

        if (handlers) {
          handlers.forEach(handler => handler(message));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.userId) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect(this.userId!);
      }, this.reconnectDelay);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.userId = null;
    this.handlers.clear();
  }

  send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  joinRoom(roomId: number) {
    this.send('join_room', { roomId });
  }

  leaveRoom(roomId: number) {
    this.send('leave_room', { roomId });
  }
}

export const wsService = new WebSocketService();
