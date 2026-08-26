import assert from 'node:assert/strict';
import makeWASocket, {
  getButtonReplyInfo,
  useMultiFileAuthState
} from '../lib/index.js';

const enabled = process.env.BAILEYS_LIVE_BUTTON_TEST === '1';

if (!enabled) {
  console.log('Live button test skipped. Set BAILEYS_LIVE_BUTTON_TEST=1 to opt in.');
  process.exit(0);
}

const recipient = process.env.BAILEYS_BUTTON_TEST_RECIPIENT?.trim();
const authDir = process.env.BAILEYS_BUTTON_TEST_AUTH_DIR?.trim() || '.button-test-auth';
const expectedId = process.env.BAILEYS_BUTTON_TEST_EXPECTED_ID?.trim();
const timeoutMs = Number(process.env.BAILEYS_BUTTON_TEST_TIMEOUT_MS || 120000);

if (!/^\d+@s\.whatsapp\.net$/.test(recipient || '')) {
  throw new Error(
    'BAILEYS_BUTTON_TEST_RECIPIENT must be an individual WhatsApp JID such as 254700000000@s.whatsapp.net'
  );
}
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
  throw new Error('BAILEYS_BUTTON_TEST_TIMEOUT_MS must be a number of at least 1000 milliseconds');
}
if (expectedId && !['continue', 'cancel'].includes(expectedId)) {
  throw new Error('BAILEYS_BUTTON_TEST_EXPECTED_ID must be either continue or cancel');
}

const { state, saveCreds } = await useMultiFileAuthState(authDir);
if (!state.creds.registered) {
  throw new Error(
    `No registered WhatsApp session found in ${authDir}. Pair an account there first; the live test never creates or prints credentials.`
  );
}

const socket = makeWASocket({
  auth: state
});
socket.ev.on('creds.update', saveCreds);

const waitForConnection = () => new Promise((resolve, reject) => {
  let timer;
  const onUpdate = ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      clearTimeout(timer);
      socket.ev.off('connection.update', onUpdate);
      resolve();
    } else if (connection === 'close') {
      clearTimeout(timer);
      socket.ev.off('connection.update', onUpdate);
      reject(lastDisconnect?.error || new Error('WhatsApp connection closed before the test started'));
    }
  };

  timer = setTimeout(() => {
    socket.ev.off('connection.update', onUpdate);
    reject(new Error(`Timed out after ${timeoutMs}ms waiting for WhatsApp connection`));
  }, timeoutMs);
  socket.ev.on('connection.update', onUpdate);
});

const waitForButtonReply = () => {
  let timer;
  let onUpsert;
  let settled = false;
  const promise = new Promise((resolve, reject) => {
    onUpsert = ({ messages }) => {
      for (const message of messages || []) {
        if (message.key?.fromMe) {
          continue;
        }
        const sender = message.key?.participant || message.key?.remoteJid;
        if (sender !== recipient) {
          continue;
        }
        const reply = getButtonReplyInfo(message);
        if (!reply) {
          continue;
        }
        clearTimeout(timer);
        socket.ev.off('messages.upsert', onUpsert);
        settled = true;
        try {
          assert.ok(['continue', 'cancel'].includes(reply.id), `unexpected button id: ${reply.id}`);
          assert.equal(reply.displayText, reply.id === 'continue' ? 'Continue' : 'Cancel');
          if (expectedId) {
            assert.equal(reply.id, expectedId);
          }
          resolve(reply);
        } catch (error) {
          reject(error);
        }
        return;
      }
    };

    timer = setTimeout(() => {
      socket.ev.off('messages.upsert', onUpsert);
      settled = true;
      reject(new Error(
        `Timed out after ${timeoutMs}ms waiting for a reply from ${recipient}. Have the recipient tap Continue or Cancel, then rerun if testing another client.`
      ));
    }, timeoutMs);
    socket.ev.on('messages.upsert', onUpsert);
  });

  return {
    promise,
    cancel: () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      socket.ev.off('messages.upsert', onUpsert);
    }
  };
};

try {
  await waitForConnection();
  console.log(`Connected. Sending the documented quick-reply example to ${recipient}.`);

  const replyWaiter = waitForButtonReply();
  try {
    await socket.sendMessage(recipient, {
      text: 'Would you like to continue?',
      title: 'Automation',
      footer: 'Lordeagle Baileys',
      buttons: [
        { id: 'continue', displayText: 'Continue' },
        { id: 'cancel', displayText: 'Cancel' }
      ]
    });

    const reply = await replyWaiter.promise;
    console.log(`Received button reply: id=${reply.id}, displayText=${reply.displayText}, type=${reply.type}`);
    console.log('Record the visual result for the client used by the recipient (Android, iPhone, Web, or Desktop).');
  } finally {
    replyWaiter.cancel();
  }
} finally {
  await socket.end();
}