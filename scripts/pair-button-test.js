import makeWASocket, { useMultiFileAuthState } from '../lib/index.js';

if (process.env.BAILEYS_LIVE_BUTTON_TEST !== '1') {
  console.log('Button test pairing skipped. Set BAILEYS_LIVE_BUTTON_TEST=1 to opt in.');
  process.exit(0);
}

const phoneNumber = process.env.BAILEYS_BUTTON_TEST_SENDER_PHONE?.trim();
const authDir = process.env.BAILEYS_BUTTON_TEST_AUTH_DIR?.trim() || '.button-test-auth';
const timeoutMs = Number(process.env.BAILEYS_BUTTON_TEST_TIMEOUT_MS || 120000);

if (!/^\d+$/.test(phoneNumber || '')) {
  throw new Error(
    'BAILEYS_BUTTON_TEST_SENDER_PHONE must contain the sender phone number with country code and digits only'
  );
}
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
  throw new Error('BAILEYS_BUTTON_TEST_TIMEOUT_MS must be a number of at least 1000 milliseconds');
}

const { state, saveCreds } = await useMultiFileAuthState(authDir);
if (state.creds.registered) {
  console.log(`A WhatsApp account is already paired in ${authDir}.`);
  process.exit(0);
}

const socket = makeWASocket({
  auth: state
});
socket.ev.on('creds.update', saveCreds);

const waitForRegistration = () => new Promise((resolve, reject) => {
  let timer;
  const cleanup = () => {
    clearTimeout(timer);
    socket.ev.off('creds.update', onCredsUpdate);
    socket.ev.off('connection.update', onConnectionUpdate);
  };
  const onCredsUpdate = update => {
    if (update.registered || state.creds.registered) {
      cleanup();
      resolve();
    }
  };
  const onConnectionUpdate = ({ connection, lastDisconnect }) => {
    if (state.creds.registered) {
      cleanup();
      resolve();
    } else if (connection === 'close') {
      cleanup();
      reject(lastDisconnect?.error || new Error('WhatsApp connection closed before pairing completed'));
    }
  };

  timer = setTimeout(() => {
    cleanup();
    reject(new Error(`Timed out after ${timeoutMs}ms waiting for WhatsApp pairing`));
  }, timeoutMs);
  socket.ev.on('creds.update', onCredsUpdate);
  socket.ev.on('connection.update', onConnectionUpdate);
});

try {
  const registrationPromise = waitForRegistration();
  registrationPromise.catch(() => {});
  await socket.waitForSocketOpen();
  const pairingCode = await socket.requestPairingCode(phoneNumber);

  console.log(`Temporary WhatsApp pairing code: ${pairingCode}`);
  console.log('On the sender phone, open WhatsApp > Linked devices > Link a device > Link with phone number instead, then enter this code.');
  await registrationPromise;
  await saveCreds();
  console.log(`Pairing complete. The local session was saved in ${authDir}.`);
} finally {
  await socket.end();
}