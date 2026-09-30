import defaultSocketFactory, * as baileys from '../lib/index.js';

if (typeof defaultSocketFactory !== 'function') {
  throw new Error('Default package export is not a socket factory.');
}

if (baileys.makeWASocket !== defaultSocketFactory) {
  throw new Error('Named and default socket factory exports do not match.');
}

if (!baileys.proto || typeof baileys.proto.Message?.encode !== 'function') {
  throw new Error('Protocol message codecs are unavailable.');
}

console.log(`Smoke test passed: imported ${Object.keys(baileys).length} package exports.`);