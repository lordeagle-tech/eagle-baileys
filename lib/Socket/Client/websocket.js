import WebSocket from 'ws';
import { DEFAULT_ORIGIN } from '../../Defaults/index.js';
import { AbstractSocketClient } from './types.js';
export class WebSocketClient extends AbstractSocketClient {
  constructor() {
    super(...arguments);
    this.socket = null;
  }
  get isOpen() {
    return this.socket?.readyState === WebSocket.OPEN;
  }
  get isClosed() {
    return this.socket === null || this.socket?.readyState === WebSocket.CLOSED;
  }
  get isClosing() {
    return this.socket === null || this.socket?.readyState === WebSocket.CLOSING;
  }
  get isConnecting() {
    return this.socket?.readyState === WebSocket.CONNECTING;
  }
  connect() {
    if (this.socket) {
      return;
    }
    this.socket = new WebSocket(this.url, {
      origin: DEFAULT_ORIGIN,
      headers: this.config.options?.headers,
      handshakeTimeout: this.config.connectTimeoutMs,
      timeout: this.config.connectTimeoutMs,
      agent: this.config.agent
    });
    this.socket.setMaxListeners(0);
    const events = ['close', 'error', 'upgrade', 'message', 'open', 'ping', 'pong'];
    for (const event of events) {
      this.socket?.on(event, (...args) => this.emit(event, ...args));
    }
  }
  async close() {
    const socket = this.socket;
    if (!socket) {
      return;
    }
    if (socket.readyState === WebSocket.CLOSED) {
      this.socket = null;
      return;
    }
    const closePromise = new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(forceCloseTimer);
        resolve();
      };
      const forceCloseTimer = setTimeout(() => {
        // A dead TCP path may never produce the close event. Do not let that
        // strand the reconnect wrapper waiting on this promise forever.
        if (socket.readyState !== WebSocket.CLOSED) {
          socket.terminate();
        }
        finish();
      }, 5000);
      socket.once('close', finish);
      try {
        socket.close();
      } catch {
        socket.terminate();
      }
    });
    await closePromise;
    if (this.socket === socket) {
      this.socket = null;
    }
  }
  send(str, cb) {
    this.socket?.send(str, cb);
    return Boolean(this.socket);
  }
}
