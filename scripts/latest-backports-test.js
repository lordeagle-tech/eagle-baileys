import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { proto } from '../WAProto/compiler.js';
import { downloadContentFromMessage } from '../lib/Utils/messages-media.js';
import processMessage from '../lib/Utils/process-message.js';
import { generateLoginNode } from '../lib/Utils/validate-connection.js';

const captureDownloadUrl = async media => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async url => {
    captured = url;
    throw new Error('stop');
  };
  try {
    await downloadContentFromMessage({ mediaKey: randomBytes(32), ...media }, 'image');
  } catch { } finally {
    globalThis.fetch = originalFetch;
  }
  return captured;
};

assert.equal(
  await captureDownloadUrl({ url: 'https://a.whatsapp.net/path', directPath: '/path' }),
  'https://mmg.whatsapp.net/path'
);
assert.equal(
  await captureDownloadUrl({ url: 'https://media-cdn-1.cdn.whatsapp.net/path', directPath: '/path' }),
  'https://media-cdn-1.cdn.whatsapp.net/path'
);
assert.equal(await captureDownloadUrl({ directPath: '/path' }), 'https://mmg.whatsapp.net/path');

const emitted = [];
const warnings = [];
const ctx = {
  creds: { me: { id: 'bot@s.whatsapp.net' }, accountSettings: {} },
  ev: { emit: (event, data) => emitted.push({ event, data }) },
  logger: { warn: (...args) => warnings.push(args) },
  shouldProcessHistoryMsg: false
};
await processMessage({
  key: { remoteJid: 'group@g.us', participant: 'attacker@s.whatsapp.net', fromMe: false, id: 'spoof' },
  messageTimestamp: 1,
  message: {
    protocolMessage: {
      type: proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_SHARE
    }
  }
}, ctx);
assert.equal(emitted.length, 0, 'spoofed self-only protocolMessage must be dropped');
assert(warnings.length > 0, 'spoofed self-only protocolMessage must be logged');

emitted.length = 0;
await processMessage({
  key: { remoteJid: 'group@g.us', participant: 'sender@s.whatsapp.net', fromMe: false, id: 'edit' },
  messageTimestamp: 1,
  message: {
    protocolMessage: {
      type: proto.Message.ProtocolMessage.Type.MESSAGE_EDIT,
      key: { id: 'target' },
      editedMessage: { conversation: 'edited' }
    }
  }
}, ctx);
assert(emitted.some(item => item.event === 'messages.update'), 'cross-user edits must still be processed');

const loginNode = generateLoginNode('254712345678:0@s.whatsapp.net', {
  browser: ['Windows', 'Desktop', '1'],
  syncFullHistory: true,
  version: [2, 3000, 1]
});
assert.equal(loginNode.webInfo.webSubPlatform, proto.ClientPayload.WebInfo.WebSubPlatform.WIN_HYBRID);
console.log('Latest upstream backport tests passed.');
