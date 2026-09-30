import assert from 'node:assert/strict';
import { proto } from '../WAProto/compiler.js';
import { assertUserPresenceSubscriptionJid } from '../lib/Socket/chats.js';
import { createFakeContact, generateVCard, generateWAMessage, generateWAMessageContent, getButtonReplyInfo, getCtaReplyInfo, getListReplyInfo } from '../lib/Utils/messages.js';
import makeWASocket, { createJidResolver, DEFAULT_CONNECTION_CONFIG, DEFAULT_PAIRING_CODE, normalizeJid, normalizePhoneNumber } from '../lib/index.js';

assert.equal(DEFAULT_PAIRING_CODE, 'NICKCORP');
// the "device linked" push request must stay on by default for pairing codes
assert.equal(DEFAULT_CONNECTION_CONFIG.showPairingPushNotification, true);
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

// Interactive CTA rows
const ctaRows = await generateWAMessageContent({
  text: 'Track your order',
  title: 'Delivery',
  footer: 'Lordeagle Baileys',
  interactiveRows: [
    { type: 'quick_reply', id: 'track', displayText: 'Track order' },
    { type: 'url', displayText: 'Open site', url: 'https://example.com/track' },
    { type: 'call', displayText: 'Call us', phoneNumber: '+254700000000' },
    { type: 'copy', displayText: 'Copy code', couponCode: 'EAGLE10' }
  ]
}, {});
assert.equal(ctaRows.interactiveMessage.body.text, 'Track your order');
assert.equal(ctaRows.interactiveMessage.header.title, 'Delivery');
assert.equal(ctaRows.interactiveMessage.footer.text, 'Lordeagle Baileys');
const ctaButtons = ctaRows.interactiveMessage.nativeFlowMessage.buttons;
assert.equal(ctaButtons.length, 4);
assert.equal(ctaButtons[0].name, 'quick_reply');
assert.deepEqual(JSON.parse(ctaButtons[0].buttonParamsJson), { display_text: 'Track order', id: 'track' });
assert.equal(ctaButtons[1].name, 'cta_url');
assert.deepEqual(JSON.parse(ctaButtons[1].buttonParamsJson), { display_text: 'Open site', url: 'https://example.com/track' });
assert.equal(ctaButtons[2].name, 'cta_call');
assert.deepEqual(JSON.parse(ctaButtons[2].buttonParamsJson), { display_text: 'Call us', phone_number: '+254700000000' });
assert.equal(ctaButtons[3].name, 'cta_copy');
assert.deepEqual(JSON.parse(ctaButtons[3].buttonParamsJson), { display_text: 'Copy code', coupon_code: 'EAGLE10' });
assert.ok(proto.Message.encode(ctaRows).finish().length > 0);

// CTA rows accept a product reference as header
const ctaProductRows = await generateWAMessageContent({
  text: 'Buy now',
  product: { productId: 'p-1', title: 'Eagle Tee', description: 'Cotton', productImage: Buffer.from('mock-product-image') },
  interactiveRows: [{ type: 'quick_reply', id: 'buy', displayText: 'Buy' }]
}, {
  upload: async () => ({ mediaUrl: 'https://mock/media', directPath: 'mock-path' })
});
assert.equal(ctaProductRows.interactiveMessage.header.hasMediaAttachment, true);
assert.ok(ctaProductRows.interactiveMessage.header.productMessage);

await assert.rejects(() => generateWAMessageContent({
  text: 'Pick',
  interactiveRows: []
}, {}), /at least one row/);

await assert.rejects(() => generateWAMessageContent({
  text: 'Pick',
  interactiveRows: [{ type: 'nope', id: 'x', displayText: 'X' }]
}, {}), /supported CTA type/);

await assert.rejects(() => generateWAMessageContent({
  text: 'Pick',
  interactiveRows: [{ type: 'url', displayText: 'No url' }]
}, {}), /url must be a non-empty string/);

await assert.rejects(() => generateWAMessageContent({
  text: 'Pick',
  interactiveRows: [{ type: 'quick_reply', id: 'dup', displayText: 'One' }, { type: 'quick_reply', id: 'dup', displayText: 'Two' }]
}, {}), /duplicate interactive row id/);

await assert.rejects(() => generateWAMessageContent({
  text: '',
  interactiveRows: [{ type: 'quick_reply', id: 'ok', displayText: 'Ok' }]
}, {}), /require non-empty text/);

// CTA reply parsing
assert.deepEqual(getCtaReplyInfo({
  message: {
    interactiveResponseMessage: {
      body: { text: 'Track order' },
      nativeFlowResponseMessage: {
        name: 'quick_reply',
        paramsJson: JSON.stringify({ id: 'track', display_text: 'Track order' }),
        version: 1
      }
    }
  }
}), {
  type: 'quick_reply',
  id: 'track',
  displayText: 'Track order'
});

assert.deepEqual(getCtaReplyInfo({
  interactiveResponseMessage: {
    nativeFlowResponseMessage: {
      name: 'cta_url',
      paramsJson: JSON.stringify({ display_text: 'Open site', url: 'https://example.com/track' })
    }
  }
}), {
  type: 'cta_url',
  displayText: 'Open site',
  url: 'https://example.com/track'
});

assert.equal(getCtaReplyInfo({
  interactiveResponseMessage: {
    nativeFlowResponseMessage: {
      paramsJson: '{not-json'
    }
  }
}), undefined);

assert.equal(getCtaReplyInfo({ text: 'plain' }), undefined);

// Native list messages (sections/rows)
const listGenerated = await generateWAMessageContent({
  list: {
    title: 'Main Menu',
    description: 'Choose a department',
    buttonText: 'Open',
    footer: 'Support',
    sections: [
      {
        title: 'Sales',
        rows: [
          { id: 'sales_1', title: 'New order', description: 'Start an order' },
          { id: 'sales_2', title: 'Track order' }
        ]
      },
      {
        title: 'Support',
        rows: [{ id: 'help', title: 'Talk to a human' }]
      }
    ]
  }
}, {});
assert.equal(listGenerated.listMessage.title, 'Main Menu');
assert.equal(listGenerated.listMessage.description, 'Choose a department');
assert.equal(listGenerated.listMessage.buttonText, 'Open');
assert.equal(listGenerated.listMessage.footerText, 'Support');
assert.equal(listGenerated.listMessage.listType, proto.Message.ListMessage.ListType.SINGLE_SELECT);
assert.equal(listGenerated.listMessage.sections.length, 2);
assert.equal(listGenerated.listMessage.sections[0].title, 'Sales');
assert.equal(listGenerated.listMessage.sections[0].rows.length, 2);
assert.equal(listGenerated.listMessage.sections[0].rows[0].rowId, 'sales_1');
assert.equal(listGenerated.listMessage.sections[0].rows[0].title, 'New order');
assert.equal(listGenerated.listMessage.sections[0].rows[0].description, 'Start an order');
assert.equal(listGenerated.listMessage.sections[1].rows[0].rowId, 'help');
assert.ok(proto.Message.encode(listGenerated).finish().length > 0);

// Flat rows shorthand
const flatList = await generateWAMessageContent({
  list: {
    title: 'Flat Menu',
    rows: [{ id: 'one', title: 'One' }]
  }
}, {});
assert.equal(flatList.listMessage.sections.length, 1);
assert.equal(flatList.listMessage.sections[0].rows[0].rowId, 'one');
assert.equal(flatList.listMessage.buttonText, 'Menu');

await assert.rejects(() => generateWAMessageContent({
  list: { title: '', rows: [{ id: 'a', title: 'A' }] }
}, {}), /list.title must be a non-empty string/);

await assert.rejects(() => generateWAMessageContent({
  list: { title: 'Menu' }
}, {}), /at least one section/);

await assert.rejects(() => generateWAMessageContent({
  list: { title: 'Menu', rows: [{ id: 'a', title: 'A' }, { id: 'a', title: 'B' }] }
}, {}), /duplicate list row id/);

await assert.rejects(() => generateWAMessageContent({
  list: { title: 'Menu', rows: [{ id: 'a', title: '' }] }
}, {}), /title must be a non-empty string/);

// List reply parsing
assert.deepEqual(getListReplyInfo({
  message: {
    listResponseMessage: {
      title: 'Main Menu',
      description: 'Choose a department',
      listType: proto.Message.ListResponseMessage.ListType.SINGLE_SELECT,
      singleSelectReply: { selectedRowId: 'sales_1' }
    }
  }
}), {
  rowId: 'sales_1',
  title: 'Main Menu',
  description: 'Choose a department'
});

assert.deepEqual(getListReplyInfo({
  viewOnceMessage: {
    message: {
      listResponseMessage: {
        singleSelectReply: { selectedRowId: 'help' }
      }
    }
  }
}), {
  rowId: 'help',
  title: '',
  description: ''
});

assert.equal(getListReplyInfo({ text: 'plain' }), undefined);
assert.equal(getListReplyInfo({ listResponseMessage: {} }), undefined);

// An explicit list must win over a stray text/caption field
const listWithText = await generateWAMessageContent({
  text: 'ignored',
  list: { title: 'Wins', rows: [{ id: 'a', title: 'A' }] }
}, {});
assert.ok(listWithText.listMessage);
assert.equal(listWithText.listMessage.title, 'Wins');
assert.equal(listWithText.conversation, undefined);

// Reactions
const reaction = await generateWAMessageContent({
  react: {
    key: { remoteJid: '254700000000@s.whatsapp.net', id: 'ABC123', fromMe: false },
    text: '👍'
  }
}, {});
assert.equal(reaction.reactionMessage.text, '👍');
assert.equal(reaction.reactionMessage.key.id, 'ABC123');
assert.ok(reaction.reactionMessage.senderTimestampMs > 0);

const reactionRemoval = await generateWAMessageContent({
  react: { key: { remoteJid: '254700000000@s.whatsapp.net', id: 'ABC123' } }
}, {});
// removing a reaction sends no text at all
assert.equal(reactionRemoval.reactionMessage.text || '', '');
assert.equal(reactionRemoval.reactionMessage.key.id, 'ABC123');

// Message edits
const edited = await generateWAMessageContent({
  text: 'Updated text',
  edit: { remoteJid: '254700000000@s.whatsapp.net', id: 'ABC123', fromMe: true }
}, {});
assert.equal(edited.protocolMessage.type, proto.Message.ProtocolMessage.Type.MESSAGE_EDIT);
assert.equal(edited.protocolMessage.key.id, 'ABC123');
assert.equal(edited.protocolMessage.editedMessage.extendedTextMessage.text, 'Updated text');
assert.ok(edited.protocolMessage.timestampMs > 0);

// Polls
const poll = await generateWAMessageContent({
  poll: {
    name: 'Lunch?',
    values: ['Pizza', 'Sushi', 'Salad']
  }
}, {});
assert.equal(poll.pollCreationMessage.name, 'Lunch?');
assert.equal(poll.pollCreationMessage.options.length, 3);
assert.equal(poll.pollCreationMessage.options[0].optionName, 'Pizza');
assert.equal(poll.pollCreationMessage.selectableOptionsCount, 0);
assert.ok(poll.messageContextInfo.messageSecret);

const quizPoll = await generateWAMessageContent({
  poll: {
    name: '2 + 2?',
    values: ['3', '4'],
    selectableCount: 1,
    pollType: 'QUIZ',
    correctAnswer: '4'
  }
}, {});
assert.equal(quizPoll.pollCreationMessageV3.pollType, proto.Message.PollType.QUIZ);
assert.equal(quizPoll.pollCreationMessageV3.correctAnswer.optionName, '4');

await assert.rejects(() => generateWAMessageContent({
  poll: { name: 'Quiz', values: ['A', 'B'], selectableCount: 1, pollType: 'QUIZ' }
}, {}), /require poll.correctAnswer/);

await assert.rejects(() => generateWAMessageContent({
  poll: { name: 'Quiz', values: ['A', 'B'], selectableCount: 2, pollType: 'QUIZ', correctAnswer: 'A' }
}, {}), /only support a single selectable option/);

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

// Test contact and fake contact helpers on socket
assert.ok(typeof mockSock.sendContact === 'function');
assert.ok(typeof mockSock.sendFakeContact === 'function');
assert.ok(typeof mockSock.createFakeContact === 'function');

// Test the new interaction/status/newsletter helpers on socket
assert.ok(typeof mockSock.sendReaction === 'function');
assert.ok(typeof mockSock.removeReaction === 'function');
assert.ok(typeof mockSock.editMessage === 'function');
assert.ok(typeof mockSock.sendList === 'function');
assert.ok(typeof mockSock.sendInteractiveRows === 'function');
assert.ok(typeof mockSock.sendStatus === 'function');
assert.ok(typeof mockSock.sendNewsletterMessage === 'function');
assert.ok(typeof mockSock.getLinkedDevices === 'function');

// Newsletter send must reject non-newsletter JIDs
await assert.rejects(() => mockSock.sendNewsletterMessage('254700000000@s.whatsapp.net', { text: 'hi' }), /@newsletter JID/);

// Reaction send must reject bad input
await assert.rejects(() => mockSock.sendReaction('254700000000@s.whatsapp.net', undefined, '👍'), /requires a message key/);
await assert.rejects(() => mockSock.sendReaction('254700000000@s.whatsapp.net', { id: 'A' }, 5), /must be a string/);
await assert.rejects(() => mockSock.editMessage('254700000000@s.whatsapp.net', undefined, { text: 'x' }), /requires the key/);
await assert.rejects(() => mockSock.editMessage('254700000000@s.whatsapp.net', { id: 'A' }, null), /requires new message content/);

// Test createFakeContact utility
const fakeContact = createFakeContact({
  name: 'chiethaa',
  number: '254700000000'
});
assert.equal(fakeContact.key.fromMe, false);
assert.equal(fakeContact.key.participant, '0@s.whatsapp.net');
assert.equal(fakeContact.key.remoteJid, 'status@broadcast');
assert.ok(typeof fakeContact.key.id === 'string' && fakeContact.key.id.length > 0);
assert.equal(fakeContact.message.contactMessage.displayName, 'chiethaa');
assert.ok(fakeContact.message.contactMessage.vcard.includes('FN:chiethaa'));
assert.ok(fakeContact.message.contactMessage.vcard.includes('waid=254700000000:254700000000'));
assert.ok(fakeContact.message.contactMessage.vcard.includes('item1.X-ABLabel:Ponsel'));

// Test quoting with user's exact snippet structure (without key.id)
const chiethaa = 'chiethaa';
const sender = '254700000000@s.whatsapp.net';
const userContactMessage = {
  key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
  message: {
    contactMessage: {
      displayName: chiethaa,
      vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;${chiethaa};;;;\nFN:${chiethaa}\nitem1.TEL;waid=${sender?.split('@')[0] ?? 'unknown'}:${sender?.split('@')[0] ?? 'unknown'}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
    }
  }
};

const quotedFake = await generateWAMessage('254700000001@s.whatsapp.net', {
  text: 'Quoted bot reply'
}, {
  userJid: '254700000000@s.whatsapp.net',
  quoted: userContactMessage
});
const quotedCtx = quotedFake.message.extendedTextMessage.contextInfo;
assert.equal(quotedCtx.participant, '0@s.whatsapp.net');
assert.equal(quotedCtx.remoteJid, 'status@broadcast');
assert.ok(typeof quotedCtx.stanzaId === 'string' && quotedCtx.stanzaId.length > 0);
assert.equal(quotedCtx.quotedMessage.contactMessage.displayName, 'chiethaa');

// Test sending userContactMessage directly as message content
const unwrappedContactMsg = await generateWAMessageContent(userContactMessage, {});
assert.equal(unwrappedContactMsg.contactMessage.displayName, 'chiethaa');
assert.ok(unwrappedContactMsg.contactMessage.vcard.includes('FN:chiethaa'));

// Test sending single contact via { contact: ... }
const singleContactMsg = await generateWAMessageContent({
  contact: {
    name: 'chiethaa',
    number: '254700000000'
  }
}, {});
assert.equal(singleContactMsg.contactMessage.displayName, 'chiethaa');
assert.ok(singleContactMsg.contactMessage.vcard.includes('FN:chiethaa'));

// Test sending multiple contacts via { contacts: [...] }
const multiContactsMsg = await generateWAMessageContent({
  contacts: [
    { name: 'One', number: '254700000001' },
    { name: 'Two', number: '254700000002' }
  ]
}, {});
assert.equal(multiContactsMsg.contactsArrayMessage.contacts.length, 2);

// Clean up/close socket connection so it doesn't keep the event loop open
mockSock.end(new Error('Test cleanup'));

console.log('Feature tests passed: buttons, interactive CTA rows, native lists, list/CTA reply parsing, reactions, edits, polls/quizzes, subscription guards, group participant/v2 functions, forwarded reply options, contact/fake-contact, status/newsletter and linked-device helpers.');