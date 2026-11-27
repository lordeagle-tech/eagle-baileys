import assert from 'node:assert/strict';
import { proto } from '../WAProto/compiler.js';
import { generateWAMessageContent, getContentType, normalizeMessageContent } from '../lib/Utils/messages.js';

const upload = async () => ({
  mediaUrl: 'https://example.invalid/fake',
  directPath: '/fake'
});
const content = await generateWAMessageContent({
  audioSticker: {
    sticker: Buffer.from('WEBP'),
    audio: Buffer.from('OGG'),
    seconds: 5,
    isAnimated: true,
    emojis: '🎵'
  }
}, { upload });

assert(content.stickerMessage, 'sticker payload must be prepared');
assert(content.audioStickerMessage, 'audio sticker wrapper must be prepared');
assert.equal(getContentType(content), 'stickerMessage');
assert.equal(content.stickerMessage.mimetype, 'image/webp');
assert.equal(content.stickerMessage.isAnimated, true);
assert.equal(content.stickerMessage.emojis, '🎵');
assert.equal(content.stickerMessage.audioMessage.mimetype, 'audio/ogg; codecs=opus');
assert.equal(content.stickerMessage.audioMessage.ptt, false);
assert.strictEqual(content.audioStickerMessage.message.stickerMessage, content.stickerMessage);

const encoded = proto.Message.encode(proto.Message.create(content)).finish();
const decoded = proto.Message.decode(encoded);
assert.equal(decoded.stickerMessage, undefined, 'top-level sticker must be replaced by field 134');
assert(decoded.audioStickerMessage?.message?.stickerMessage?.audioMessage, 'field 134 must carry the sound sticker');
assert.equal(decoded.audioStickerMessage.message.stickerMessage.audioMessage.mimetype, 'audio/ogg; codecs=opus');

const normalized = normalizeMessageContent(decoded);
assert(normalized?.stickerMessage?.audioMessage, 'sound sticker must normalize to stickerMessage');
console.log('Audio sticker tests passed.');
