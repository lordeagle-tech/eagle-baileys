import assert from 'node:assert/strict';
import { proto } from '../WAProto/compiler.js';
import { assertUserPresenceSubscriptionJid } from '../lib/Socket/chats.js';
import { generateWAMessageContent, getButtonReplyInfo } from '../lib/Utils/messages.js';
import makeWASocket, { createJidResolver, DEFAULT_PAIRING_CODE, normalizeJid, normalizePhoneNumber } from '../lib/index.js';

assert.equal(DEFAULT_PAIRING_CODE, 'NICKCORP');
assert.equal(normalizePhoneNumber('+254 (700) 000-000'), '254700000000');
assert.equal(normalizeJid('+254 700 000 000'), '254700000000@s.whatsapp.net');
assert.equal(normalizeJid('12345@c.us'), '12345@s.whatsapp.net');
assert.equal(normalizeJid('12345:2@lid'), '12345:2@lid');
const jidResolver = createJidResolver({
  support: '+254700000001'
});
assert.equal(jidResolver.resolve('support'), '254700000001@s.whatsapp.net');
assert.equal(jidResolver.setAlias('team', '254700000002'), '254700000002@s.whatsapp.net');
assert.equal(jidResolver.removeAlias('team'), true);
assert.deepEqual(jidResolver.getAliases(), {
  support: '254700000001@s.whatsapp.net'
});
assert.throws(() => normalizeJid('unknown-contact'), /Phone number must contain/);

const generated = await generateWAMessageContent({
  text: 'Choose an option',
  title: 'Automation',
  footer: 'Lordeagle Baileys',
  buttons: [{
    id: 'approve',
    displayText: 'Approve'
  }, {
    id: 'decline',
    displayText: 'Decline'
  }]
}, {});

assert.equal(generated.interactiveMessage.body.text, 'Choose an option');
assert.equal(generated.interactiveMessage.header.title, 'Automation');
assert.equal(generated.interactiveMessage.footer.text, 'Lordeagle Baileys');
assert.equal(generated.interactiveMessage.nativeFlowMessage.messageVersion, 1);
assert.equal(generated.interactiveMessage.nativeFlowMessage.buttons.length, 2);
assert.deepEqual(JSON.parse(generated.interactiveMessage.nativeFlowMessage.buttons[0].buttonParamsJson), {
  display_text: 'Approve',
  id: 'approve'
});
assert.ok(proto.Message.encode(generated).finish().length > 0);

const generatedFromLegacyFields = await generateWAMessageContent({
  text: 'Choose an option',
  buttons: [{
    buttonId: 'legacy-shape',
    buttonText: {
      displayText: 'Legacy shape'
    }
  }]
}, {});
assert.deepEqual(JSON.parse(generatedFromLegacyFields.interactiveMessage.nativeFlowMessage.buttons[0].buttonParamsJson), {
  display_text: 'Legacy shape',
  id: 'legacy-shape'
});

await assert.rejects(() => generateWAMessageContent({
  text: 'Choose',
  buttons: []
}, {}), /between 1 and 3/);

await assert.rejects(() => generateWAMessageContent({
  text: 'Choose',
  buttons: [{
    id: 'one',
    displayText: 'One'
  }, {
    id: 'two',
    displayText: 'Two'
  }, {
    id: 'three',
    displayText: 'Three'
  }, {
    id: 'four',
    displayText: 'Four'
  }]
}, {}), /between 1 and 3/);

await assert.rejects(() => generateWAMessageContent({
  text: 'Choose',
  buttons: [{
    id: 'same',
    displayText: 'First'
  }, {
    id: 'same',
    displayText: 'Second'
  }]
}, {}), /duplicate button id/);

await assert.rejects(() => generateWAMessageContent({
  text: 'Choose',
  buttons: [{
    id: 'too-long',
    displayText: 'This button label is longer than twenty characters'
  }]
}, {}), /no longer than 20 characters/);

await assert.rejects(() => generateWAMessageContent({
  text: '',
  buttons: [{
    id: 'valid',
    displayText: 'Valid'
  }]
}, {}), /require non-empty text/);

await assert.rejects(() => generateWAMessageContent({
  text: 'Choose',
  buttons: [{
    id: '',
    displayText: 'Missing ID'
  }]
}, {}), /id must be a non-empty string/);

assert.deepEqual(getButtonReplyInfo({
  message: {
    buttonsResponseMessage: {
      selectedButtonId: 'legacy-yes',
      selectedDisplayText: 'Yes'
    }
  }
}), {
  id: 'legacy-yes',
  displayText: 'Yes',
  type: 'legacy'
});

assert.deepEqual(getButtonReplyInfo({
  message: {
    templateButtonReplyMessage: {
      selectedId: 'template-yes',
      selectedDisplayText: 'Yes',
      selectedIndex: 1
    }
  }
}), {
  id: 'template-yes',
  displayText: 'Yes',
  type: 'template'
});

assert.deepEqual(getButtonReplyInfo({
  message: {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: 'Approve'
          },
          nativeFlowResponseMessage: {
            name: 'quick_reply',
            paramsJson: JSON.stringify({
              id: 'approve',
              display_text: 'Approve'
            }),
            version: 1
          }
        }
      }
    }
  }
}), {
  id: 'approve',
  displayText: 'Approve',
  type: 'interactive'
});

assert.equal(getButtonReplyInfo({
  interactiveResponseMessage: {
    nativeFlowResponseMessage: {
      paramsJson: '{not-json'
    }
  }
}), undefined);

assert.equal(assertUserPresenceSubscriptionJid('12345@c.us'), '12345@s.whatsapp.net');
assert.equal(assertUserPresenceSubscriptionJid('12345@lid'), '12345@lid');
assert.throws(() => assertUserPresenceSubscriptionJid('12345@g.us'), /individual user JIDs/);
assert.throws(() => assertUserPresenceSubscriptionJid('12345@newsletter'), /individual user JIDs/);
assert.throws(() => assertUserPresenceSubscriptionJid('status@broadcast'), /individual user JIDs/);
assert.throws(() => assertUserPresenceSubscriptionJid('@s.whatsapp.net'), /individual user JIDs/);
assert.throws(() => assertUserPresenceSubscriptionJid('@lid'), /individual user JIDs/);
assert.throws(() => assertUserPresenceSubscriptionJid('x@evil@s.whatsapp.net'), /individual user JIDs/);
assert.throws(() => assertUserPresenceSubscriptionJid('123:4@s.whatsapp.net'), /individual user JIDs/);
assert.throws(() => assertUserPresenceSubscriptionJid('not-a-number@s.whatsapp.net'), /individual user JIDs/);

// Test button message with caption instead of text
const captionGenerated = await generateWAMessageContent({
  caption: 'Body Caption',
  buttons: [{ id: 'opt1', displayText: 'Option 1' }]
}, {});
assert.equal(captionGenerated.interactiveMessage.body.text, 'Body Caption');

// Test location button message
const locationButtons = await generateWAMessageContent({
  text: 'Select Location',
  location: { degreesLatitude: -1.2, degreesLongitude: 36.8, name: 'Nairobi' },
  buttons: [{ id: 'loc1', displayText: 'Select' }]
}, {});
assert.equal(locationButtons.interactiveMessage.body.text, 'Select Location');
assert.equal(locationButtons.interactiveMessage.header.hasMediaAttachment, true);
assert.equal(locationButtons.interactiveMessage.header.locationMessage.degreesLatitude, -1.2);

// Test image buttons (with mock image buffer)
const imageButtons = await generateWAMessageContent({
  caption: 'Image buttons',
  image: Buffer.from('mock-image-data'),
  buttons: [{ id: 'img1', displayText: 'Click Me' }]
}, {
  upload: async (filePath) => {
    return { mediaUrl: 'https://mock/media', directPath: 'mock-path' };
  }
});
assert.equal(imageButtons.interactiveMessage.body.text, 'Image buttons');
assert.equal(imageButtons.interactiveMessage.header.hasMediaAttachment, true);
assert.ok(imageButtons.interactiveMessage.header.imageMessage);

// Test socket connection properties and ping exports
const mockSock = makeWASocket({
  auth: {
    creds: {
      noiseKey: { public: new Uint8Array(32), private: new Uint8Array(32) },
      pairingEphemeralKeyPair: { public: new Uint8Array(32), private: new Uint8Array(32) },
      signedIdentityKey: { public: new Uint8Array(32), private: new Uint8Array(32) },
      signedPreKey: { keyId: 1, keyPair: { public: new Uint8Array(32), private: new Uint8Array(32) } },
      registrationId: 1,
      advSecretKey: 'abc',
      nextPreKeyId: 1,
      firstUnuploadedPreKeyId: 1,
      accountSettings: { unarchiveChats: false }
    },
    keys: {
      get: async () => ({}),
      set: async () => ({}),
      transaction: async (cb) => cb()
    }
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    trace: () => {},
    child: function() { return this; }
  },
  jidAliases: {
    support: '+254700000001'
  }
});

assert.equal(mockSock.connectionState, 'connecting');
assert.equal(mockSock.isConnected, false);
assert.ok(typeof mockSock.groupParticipantsAdd === 'function');
assert.ok(typeof mockSock.groupParticipantsRemove === 'function');
assert.ok(typeof mockSock.groupParticipantsPromote === 'function');
assert.ok(typeof mockSock.groupParticipantsDemote === 'function');
assert.ok(typeof mockSock.groupParticipantsApprove === 'function');
assert.ok(typeof mockSock.groupParticipantsReject === 'function');

// Test groupInvite / groupMessageV2 generation
const groupInviteGenerated = await generateWAMessageContent({
  groupInvite: {
    groupJid: '120363000000000000@g.us',
    inviteCode: 'ABCDEF123456',
    inviteExpiration: 1700000000,
    groupName: 'Test Group V2',
    caption: 'Join our group'
  }
}, {});
assert.equal(groupInviteGenerated.groupInviteMessage.groupJid, '120363000000000000@g.us');
assert.equal(groupInviteGenerated.groupInviteMessage.inviteCode, 'ABCDEF123456');
assert.equal(groupInviteGenerated.groupInviteMessage.groupName, 'Test Group V2');
assert.equal(groupInviteGenerated.groupInviteMessage.caption, 'Join our group');

// Test top-level forwarding and externalAdReply properties
const forwardedMsg = await generateWAMessageContent({
  text: 'Forwarded bot reply test',
  isForwarded: true,
  forwardingScore: 999,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363322464215140@newsletter',
    newsletterName: 'EAGLE-BOTS'
  }
}, {});
assert.equal(forwardedMsg.extendedTextMessage.contextInfo.isForwarded, true);
assert.equal(forwardedMsg.extendedTextMessage.contextInfo.forwardingScore, 999);
assert.equal(forwardedMsg.extendedTextMessage.contextInfo.forwardedNewsletterMessageInfo.newsletterJid, '120363322464215140@newsletter');

// Clean up/close socket connection so it doesn't keep the event loop open
mockSock.end(new Error('Test cleanup'));

console.log('Feature tests passed: buttons, replies, subscription guards, group participant/v2 functions, and forwarded reply options.');