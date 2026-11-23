import { Boom } from '@hapi/boom';
import { DEFAULT_CONNECTION_CONFIG } from '../Defaults/index.js';
import { makeEventBuffer } from '../Utils/event-buffer.js';
import { bindOnConnected, bindWaitForConnectionUpdate } from '../Utils/generics.js';
import { DisconnectReason } from '../Types/index.js';
import { makeCommunitiesSocket } from './communities.js';
const NON_RECONNECTABLE_CODES = new Set([DisconnectReason.loggedOut, DisconnectReason.forbidden, DisconnectReason.connectionReplaced, DisconnectReason.badSession, DisconnectReason.multideviceMismatch]);
const getDisconnectStatusCode = error => error?.output?.statusCode ?? error?.statusCode;
const defaultShouldReconnect = ({
  error
}) => !NON_RECONNECTABLE_CODES.has(getDisconnectStatusCode(error));
// A pairing-code attempt lives on the connection that sent companion_hello:
// a blind reconnect recreates the socket but cannot resume the handshake (it
// never re-sends companion_hello), so it would only produce a half-open
// session. Leave those reconnects to the application, which can re-request a
// code once the new socket is up.
const isPairingPending = config => {
  const creds = config.auth?.creds;
  if (!creds?.pairingCode) {
    return false;
  }
  return !(creds.me?.id && (creds.registered || creds.account));
};
export const makeReconnectableSocket = config => {
  const logger = config.logger;
  const createSocket = config.socketFactory || makeCommunitiesSocket;
  const publicEv = makeEventBuffer(logger);
  let currentSocket;
  let reconnectTimer;
  let stopped = false;
  let suppressReconnect = false;
  let reconnectAttempts = 0;
  const getConnectionState = () => {
    if (stopped) {
      return 'close';
    }
    if (reconnectTimer) {
      return 'connecting';
    }
    return currentSocket?.connectionState ?? 'connecting';
  };
  const isConnected = () => getConnectionState() === 'open';
  const waitForConnection = async (timeoutMs = config.defaultQueryTimeoutMs) => {
    const state = getConnectionState();
    if (state === 'open') {
      return;
    }
    if (state === 'close') {
      throw new Boom('Connection Closed', {
        statusCode: DisconnectReason.connectionClosed
      });
    }
    await bindWaitForConnectionUpdate(publicEv)(
      update => update.connection === 'open',
      timeoutMs
    );
  };
  const attachSocket = socket => {
    currentSocket = socket;
    socket.ev.on('event', eventMap => {
      const connectionUpdate = eventMap['connection.update'];
      for (const [event, data] of Object.entries(eventMap)) {
        publicEv.emit(event, data);
      }
      if (connectionUpdate?.connection === 'open') {
        reconnectAttempts = 0;
      } else if (connectionUpdate?.connection === 'close') {
        scheduleReconnect(connectionUpdate.lastDisconnect?.error);
      }
    });
  };
  const scheduleReconnect = error => {
    if (stopped || suppressReconnect || !config.autoReconnect || reconnectTimer || isPairingPending(config) || !(config.shouldReconnect ?? defaultShouldReconnect)({
      error,
      attempt: reconnectAttempts + 1
    })) {
      return;
    }
    const attempt = reconnectAttempts + 1;
    if (Number.isFinite(config.maxReconnectAttempts) && attempt > config.maxReconnectAttempts) {
      logger.warn({
        attempt,
        error
      }, 'maximum automatic reconnect attempts reached');
      publicEv.emit('connection.update', {
        connection: 'close',
        lastDisconnect: {
          error,
          date: new Date()
        },
        reconnectFailed: true,
        reconnectAttempts: reconnectAttempts
      });
      return;
    }
    reconnectAttempts = attempt;
    const delay = Math.min(config.reconnectMaxDelayMs, config.reconnectInitialDelayMs * 2 ** (attempt - 1));
    logger.info({
      attempt,
      delay
    }, 'scheduling automatic reconnect');
    publicEv.emit('connection.update', {
      connection: 'connecting',
      isReconnecting: true,
      reconnectAttempt: attempt,
      reconnectDelayMs: delay
    });
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      if (stopped) {
        return;
      }
      try {
        attachSocket(createSocket(config));
      } catch (reconnectError) {
        logger.error({
          error: reconnectError,
          attempt
        }, 'failed to create replacement socket');
        scheduleReconnect(reconnectError);
      }
    }, delay);
  };
  const reconnect = async () => {
    if (stopped) {
      throw new Error('Socket has been ended');
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    reconnectAttempts = 0;
    const previousSocket = currentSocket;
    suppressReconnect = true;
    try {
      if (previousSocket && previousSocket.connectionState !== 'close') {
        await previousSocket.end();
      }
    } finally {
      suppressReconnect = false;
    }
    attachSocket(createSocket(config));
    return proxy;
  };
  attachSocket(createSocket(config));
  const proxy = new Proxy({}, {
    get(target, property) {
      if (property === 'ev') {
        return publicEv;
      }
      if (property === 'end') {
        return async error => {
          stopped = true;
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = undefined;
          }
          const result = await currentSocket?.end(error);
          return result;
        };
      }
      if (property === 'reconnect') {
        return reconnect;
      }
      if (property === 'connectionState') {
        return getConnectionState();
      }
      if (property === 'isConnected') {
        return isConnected();
      }
      if (property === 'waitForConnection') {
        return waitForConnection;
      }
      if (property === 'onConnected') {
        return bindOnConnected(publicEv, isConnected);
      }
      if (property === 'waitForConnectionUpdate') {
        return bindWaitForConnectionUpdate(publicEv);
      }
      if (property === 'getConnectionHealth') {
        return () => ({
          ...(currentSocket?.getConnectionHealth?.() ?? {}),
          state: getConnectionState(),
          isReconnecting: Boolean(reconnectTimer)
        });
      }
      if (Object.prototype.hasOwnProperty.call(target, property)) {
        return target[property];
      }
      const value = currentSocket?.[property];
      return typeof value === 'function' ? value.bind(currentSocket) : value;
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
    defineProperty(target, property, descriptor) {
      Object.defineProperty(target, property, descriptor);
      return true;
    },
    deleteProperty(target, property) {
      delete target[property];
      return true;
    }
  });
  return proxy;
};
const makeWASocket = config => {
  const newConfig = {
    ...DEFAULT_CONNECTION_CONFIG,
    ...config
  };
  return newConfig.autoReconnect ? makeReconnectableSocket(newConfig) : makeCommunitiesSocket(newConfig);
};
export default makeWASocket;
