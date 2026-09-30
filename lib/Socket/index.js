import { DEFAULT_CONNECTION_CONFIG } from '../Defaults/index.js';
import { makeEventBuffer } from '../Utils/event-buffer.js';
import { DisconnectReason } from '../Types/index.js';
import { makeCommunitiesSocket } from './communities.js';
const NON_RECONNECTABLE_CODES = new Set([DisconnectReason.loggedOut, DisconnectReason.forbidden, DisconnectReason.connectionReplaced, DisconnectReason.badSession, DisconnectReason.multideviceMismatch]);
const getDisconnectStatusCode = error => error?.output?.statusCode ?? error?.statusCode;
const defaultShouldReconnect = ({
  error
}) => !NON_RECONNECTABLE_CODES.has(getDisconnectStatusCode(error));
const makeReconnectableSocket = config => {
  const logger = config.logger;
  const publicEv = makeEventBuffer(logger);
  let currentSocket;
  let reconnectTimer;
  let stopped = false;
  let suppressReconnect = false;
  let reconnectAttempts = 0;
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
    if (stopped || suppressReconnect || !config.autoReconnect || reconnectTimer || !(config.shouldReconnect ?? defaultShouldReconnect)({
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
        attachSocket(makeCommunitiesSocket(config));
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
    attachSocket(makeCommunitiesSocket(config));
    return proxy;
  };
  attachSocket(makeCommunitiesSocket(config));
  const proxy = new Proxy({}, {
    get(_target, property) {
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
          publicEv.destroy();
          return result;
        };
      }
      if (property === 'reconnect') {
        return reconnect;
      }
      const value = currentSocket?.[property];
      return typeof value === 'function' ? value.bind(currentSocket) : value;
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
