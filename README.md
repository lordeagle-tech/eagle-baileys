# Lordeagle Baileys

> A Baileys-compatible WebSocket library designed for automations.

Lordeagle Baileys is an independently maintained fork for developers building WhatsApp Web automations with Node.js. It keeps the familiar Baileys public API while providing a separate package identity and repository for Lord Eagle’s changes.

## Install

### Option A: From NPM Registry
```sh
npm install @lordeagle21/baileys
```

### Option B: Directly from GitHub
```sh
npm install github:lordeagle-tech/eagle-baileys
```

## Basic Bot Usage

```js
import makeWASocket, { useMultiFileAuthState } from '@lordeagle21/baileys'

const { state, saveCreds } = await useMultiFileAuthState('auth_info')

const socket = makeWASocket({
  auth: state,
  // Omit pairingCode to generate a fresh secure code per request
})

socket.ev.on('creds.update', saveCreds)

socket.ev.on('messages.upsert', async ({ messages }) => {
  const m = messages[0]
  if (!m.message || m.key.fromMe) return

  const jid = m.key.remoteJid
  console.log('Received message from:', jid)
})
```

### Connection Helpers

`connectionState` / `isConnected` expose the current state, and `waitForConnection()` resolves once the bot is online instead of wiring up a listener yourself:

```js
console.log(socket.connectionState) // 'connecting' | 'open' | 'close'
console.log(socket.isConnected)     // boolean

await socket.waitForConnection()          // waits for connection: 'open'
await socket.waitForConnection(30_000)    // optional timeout in ms

// Run a callback on every open (including reconnects); returns an unsubscribe fn
const off = socket.onConnected(() => console.log('bot is online'))
// off()
```

These helpers stay bound to the stable socket facade, so `onConnected` keeps firing after an automatic reconnect and calls to `waitForConnection` / `isConnected` reflect the replacement socket rather than a closed one. `getConnectionHealth()` also reports the live wrapper state and an `isReconnecting` flag.

## Bot Features

### 1. Contact & Fake Contact Quote (`fkon`)

Send contact cards directly or reply quoting a fake status broadcast contact:

```js
// Send a contact card
await socket.sendContact(jid, '254700000000', 'chiethaa')

// Or reply using a fake contact quote (fkon)
const fkon = socket.createFakeContact({
  name: 'chiethaa',
  number: '254700000000',
})

await socket.sendMessage(jid, { text: 'Hello from bot!' }, { quoted: fkon })

// Shorthand method
await socket.sendFakeContact(jid, 'Hello from bot!', {
  name: 'chiethaa',
  number: '254700000000',
})
```

### 2. Quick-Reply Buttons

Send interactive quick-reply buttons with text or media headers. Up to 3 buttons render as native quick replies; pass more than 3 and the library automatically falls back to native-flow rows, so you can keep using `buttons` regardless of count:

```js
import { getButtonReplyInfo } from '@lordeagle21/baileys'

// 1-3 buttons: native quick replies
await socket.sendMessage(jid, {
  text: 'Choose an option below:',
  title: 'Automation',
  footer: 'Lordeagle Baileys',
  buttons: [
    { id: 'btn_yes', displayText: 'Yes' },
    { id: 'btn_no', displayText: 'No' },
  ],
})

// More than 3 buttons: same API, sent as native-flow rows
await socket.sendMessage(jid, {
  text: 'Pick a department:',
  buttons: [
    { id: 'sales', displayText: 'Sales' },
    { id: 'support', displayText: 'Support' },
    { id: 'billing', displayText: 'Billing' },
    { id: 'other', displayText: 'Other' },
  ],
})

// Listen for button replies (works for both shapes)
socket.ev.on('messages.upsert', ({ messages }) => {
  const reply = getButtonReplyInfo(messages[0])
  if (reply) {
    console.log(`Button tapped: ${reply.id} (${reply.displayText})`)
  }
})
```

### 3. Interactive CTA Rows

CTA rows accept any number of rows and each row can be a different action type — quick reply, URL, call, copy coupon, product, or flow:

```js
import { getCtaReplyInfo } from '@lordeagle21/baileys'

await socket.sendInteractiveRows(jid, {
  text: 'Track your order',
  title: 'Delivery',
  footer: 'Lordeagle Baileys',
  interactiveRows: [
    { type: 'quick_reply', id: 'track', displayText: 'Track order' },
    { type: 'url', displayText: 'Open site', url: 'https://example.com/track' },
    { type: 'call', displayText: 'Call us', phoneNumber: '+254700000000' },
    { type: 'copy', displayText: 'Copy code', couponCode: 'EAGLE10' },
  ],
})

// Parse the tapped row
socket.ev.on('messages.upsert', ({ messages }) => {
  const cta = getCtaReplyInfo(messages[0])
  if (cta) {
    console.log(`Row tapped: ${cta.type} / ${cta.id ?? cta.url ?? cta.phoneNumber ?? ''}`)
  }
})
```

Product headers work here too, exactly like quick-reply buttons:

```js
await socket.sendInteractiveRows(jid, {
  text: 'Buy now',
  product: { productId: 'p-1', title: 'Eagle Tee', productImage: './tee.jpg' },
  interactiveRows: [{ type: 'quick_reply', id: 'buy', displayText: 'Buy' }],
})
```

### 4. Native List Messages

Send a WhatsApp single-select list with sections and rows (max 10 sections, max 10 rows each):

```js
import { getListReplyInfo } from '@lordeagle21/baileys'

await socket.sendList(jid, {
  title: 'Main Menu',
  description: 'Choose a department',
  buttonText: 'Open',
  footer: 'Support',
  sections: [
    {
      title: 'Sales',
      rows: [
        { id: 'new_order', title: 'New order', description: 'Start an order' },
        { id: 'track_order', title: 'Track order' },
      ],
    },
    { title: 'Support', rows: [{ id: 'help', title: 'Talk to a human' }] },
  ],
})

// Or use a flat list without sections
await socket.sendList(jid, { title: 'Flat Menu', rows: [{ id: 'one', title: 'One' }] })

// Parse the selected row
socket.ev.on('messages.upsert', ({ messages }) => {
  const list = getListReplyInfo(messages[0])
  if (list) {
    console.log(`Selected row: ${list.rowId}`)
  }
})
```

### 5. Reactions, Edits & Polls

```js
// React to any message
await socket.sendReaction(jid, message.key, '👍')

// Remove a reaction (send an empty string)
await socket.removeReaction(jid, message.key)

// Edit a previously sent text message
await socket.editMessage(jid, message.key, { text: 'Corrected text' })

// Create a poll
await socket.sendMessage(jid, {
  poll: {
    name: 'Lunch?',
    values: ['Pizza', 'Sushi', 'Salad'],
  },
})

// Quiz poll with a correct answer
await socket.sendMessage(jid, {
  poll: {
    name: '2 + 2?',
    values: ['3', '4'],
    selectableCount: 1,
    pollType: 'QUIZ',
    correctAnswer: '4',
  },
})
```

Timed polls pass `endTime` (seconds), and `allowAddOption` / `hideParticipantName` are supported. Cast a vote with the poll's `messageContextInfo.messageSecret` and the deviceless creator/voter JIDs in the chat's addressing mode (LIDs first in LID chats):

```js
const pollMessage = await socket.sendMessage(jid, {
  poll: { name: 'Lunch?', values: ['Pizza', 'Sushi'], selectableCount: 1 },
})

await socket.sendPollVote(jid, {
  pollCreationMessageKey: pollMessage.key,
  pollEncKey: pollMessage.message.messageContextInfo.messageSecret,
  selectedOptions: ['Pizza'], // [] withdraws the vote
  pollCreatorJid: socket.user.lid,          // or socket.user.id for a PN chat
  voterJid: '111111111111111@lid',
})
```

`encryptPollVote` / `decryptPollVote` are exported for custom flows. Incoming votes are decrypted with the LID/PN fallback matrix, so votes in LID-addressed groups aggregate correctly.

### 6. Status & Newsletter

```js
// Post a status update visible to the given contacts
await socket.sendStatus({ text: 'Bot is online!' }, [
  '254700000000',
  '254700000001',
])

// Send to a WhatsApp channel (newsletter)
await socket.sendNewsletterMessage('120363322464215140@newsletter', {
  text: 'New release!',
})

// Limit a status post to the Close Friends audience
await socket.sendStatus({ text: 'Behind the scenes' }, recipients, {
  audience: 'close_friends',
})
```

Inbound channel view counts are emitted as `newsletter.view`:

```js
socket.ev.on('newsletter.view', update => {
  console.log(update.server_id, update.count)
})
```

### 7. Bot HTML Responses

The library also supports WhatsApp bot-style HTML payloads that render as a forwarded bot response:

```js
await socket.sendHtml(jid, `
  <h1>Welcome</h1>
  <p>Your bot is online.</p>
  <a href="https://example.com">Open dashboard</a>
`)

// Or use the alias with a clearer bot-specific name
await socket.sendBotHtml(jid, '<strong>Live</strong> updates are enabled.')
```

These messages carry a `richResponseMessage` payload with `FOAHtmlPrimitiveDemoDONOTUSE` plus the `botRenderingConfigMetadata` that WhatsApp Business clients require. After sending the rich envelope, the library replays it as a type-14 edit so compatible clients render it immediately instead of showing a Download prompt. Disable the compatibility replay with `{ renderRichResponse: false }`.

Pass an object to supply trusted sources or multiple interactive tabs:

```js
await socket.sendHtml(jid, {
  html: '<h1>Dashboard</h1>',
  trustedSources: ['https://example.com']
})

await socket.sendRichHtml(jid, {
  title: 'Status',
  trustedSources: ['https://example.com'],
  tabs: [
    { id: 'summary', tab_header: 'Summary', html: '<p>All systems operational.</p>' },
    { id: 'metrics', tab_header: 'Metrics', html: '<p>Uptime: 99.9%</p>', url: 'https://example.com/metrics' }
  ]
})
```

`sendRichHtmlMessage` is an alias for `sendRichHtml`.

### 8. Linked Devices

When `requestPairingCode()` generates a code, WhatsApp normally shows a "link a device" notification on the owner's phone. That notification is produced by WhatsApp's servers — a client library can only *request* it, via the `should_show_push_notification` flag on the `companion_hello` (pair-code) stage. It is requested by default:

```js
const socket = makeWASocket({
  auth: state,
  showPairingPushNotification: true, // default; set false to request no notification
})
```

The flag is deliberately **not** repeated on `companion_finish`. That stage is sent with exactly `jid` and `stage` — the same minimal payload upstream Baileys sends — so nothing outside the known-good schema can make the server drop the finish reply after the code has already been accepted on the phone.

Two things to keep in mind:

- The alert only fires for a **genuinely new** device. Reusing an existing auth folder means the server sees a reconnect of a known session, so no alert — test with a fresh folder to see it once.
- If the server-side alert is unreliable in your setup, you can have the bot send its own. The library reports every device change:

```js
// Fires when a device is paired to the account
socket.ev.on('devices.link', ([{ devices }]) => {
  console.log('New device linked:', devices)
  // e.g. notify the owner: await socket.sendMessage(ownerJid, { text: 'New device linked!' })
})

// Fires when a device is unlinked
socket.ev.on('devices.unlink', ([{ devices }]) => {
  console.log('Device unlinked:', devices)
})

// Any device list change
socket.ev.on('devices.update', ([{ tag, devices }]) => {
  console.log(`Device list ${tag}:`, devices)
})

// Or poll the current linked device list on demand
const devices = await socket.getLinkedDevices()
console.log(devices.map(d => d.id))
```

### 8. Pairing Code

Connect without scanning a QR code using an 8-character pairing code:

```js
const socket = makeWASocket({
  auth: state,
})

const code = await socket.requestPairingCode('254700000000')
console.log(`Pairing code: ${code}`)
```

`requestPairingCode` can be called immediately after `makeWASocket` — even before the WebSocket is open. It waits for the connection, then sends the pairing handshake once the server is ready, so bots no longer need a manual delay or `waitForSocketOpen`.

The code comes from the per-call argument or `pairingCode` in the socket config, in that order. If neither is provided, `requestPairingCode` generates a fresh secure 8-character code for that request. Passing a custom code remains supported:

```js
const code = await socket.requestPairingCode('254700000000', 'ABCDEFGH')
```

Pairing codes must be exactly 8 characters drawn from `123456789ABCDEFGHJKLMNPQRSTVWXYZ` (Crockford base32 — no `0`, `I`, `O` or `U`). The key is derived with PBKDF2 over the exact string, so a character the phone reinterprets produces a different key on each side and the link silently never completes; `normalizePairingCode` rejects anything outside that set rather than letting it fail later.

Phone numbers may also be passed in international format with a leading `+` or separators. Pairing codes are stored and returned in their raw 8-character form; formatted values such as `ABCD-EFGH` are normalized before use, so keep the raw code for retries and add a separator only when displaying it. Do not use a permanent shared pairing code in production.

### Albums and newer WhatsApp identifiers

Send a native WhatsApp media album by passing at least two image or video items. The library sends the album parent first and associates each media message with it using WhatsApp's `MEDIA_ALBUM` message association:

```js
const result = await socket.sendAlbum(jid, [
  { image: firstImageBuffer, caption: 'First photo' },
  { image: secondImageBuffer },
  { video: shortVideoBuffer, mimetype: 'video/mp4' },
])
console.log(result.album.key.id, result.messages.length)
```

Username lookup and LID/phone-number mapping are supported. WhatsApp's newer Business-Scoped User IDs (BSUIDs) and Group Message History are not yet exposed as complete linked-device APIs by upstream Baileys, so this fork does not guess a wire format for them. They should be added only after the corresponding Web protocol flow is verified.

### Audio and video calls

The socket supports creating WhatsApp audio or video call links and receiving call signaling updates:

```js
const audioLink = await socket.createCallLink('audio')
const videoLink = await socket.createCallLink('video')

socket.ev.on('call', ([call]) => {
  console.log(call.status, call.isVideo ? 'video' : 'audio', call.id)
})
```

This library does not terminate live call media. Audio/video transport requires a WebRTC implementation with ICE, DTLS, SRTP, device capture, codecs, and WhatsApp's current call signaling flow. The current upstream Baileys project exposes call-link and signaling support but does not provide that media engine, so adding a fake `startCall()` method would not produce a working call.

### Production message storage

For production deployments, configure `getMessage` with durable message storage. WhatsApp may request a message again after the in-memory retry cache has expired or after the process restarts; without the original message, Baileys cannot re-encrypt and resend it. The built-in in-memory store is useful for development, while a database-backed store should be used for long-running bots.

```js
const socket = makeWASocket({
  auth: state,
  getMessage: async key => messageStore.get(key.remoteJid, key.id),
})
```

Multi-file auth writes use per-file locks and atomic temporary-file replacement, so an interrupted write does not leave the active credential file partially written. For multi-process deployments, prefer the SQLite or another transactional auth store.

### 9. JID Normalization & Aliases

Normalize phone numbers and set local aliases:

```js
const socket = makeWASocket({
  auth: state,
  jidAliases: {
    support: '+254 700 000 001',
  },
})

await socket.sendMessage('support', { text: 'Hello support!' })
await socket.sendMessage('+254 700 000 002', { text: 'Hello!' })
```

## Contacts, blocklist, pins, and view-once media

```js
// Single-number existence check
const { jid, exists } = await socket.checkNumber('+254 700 000 000')

// Block / unblock with automatic LID <-> PN resolution
await socket.blockContact(jid)
await socket.unblockContact(jid)
console.log(await socket.fetchBlocklist())

// Pin / unpin a chat (app-state)
await socket.pinChat(jid, true)
await socket.pinChat(jid, false)

// Pin a message in a chat
await socket.sendMessage(jid, {
  pin: message.key,
  type: 1,       // 1 = pin for 24h, 2 = 72h, 3 = keep
  time: 86400,
})

// Download a view-once image/video/audio/sticker/document while its
// mediaKey/directPath are still available in the received message.
const buffer = await socket.downloadViewOnce(viewOnceMessage)
```

Server-side recovery of a view-once item after the media was consumed or expired is not implemented: it needs a verified re-request flow, not a guessed stanza. Persist messages/media if you need them later.

## Protocol-gated features

Reporting-token helpers (`getMessageReportingToken`, `shouldIncludeReportingToken`) are included, but a full `reportSpam` action is not: no verified IQ shape was available in this fork's captures. Channel scheduled posts, channel poll votes, channel view receipts, Close Friends list management, and sticker save/packs app-state patches are also intentionally omitted rather than guessed. If you have a packet capture from a real client for any of these, they can be added without inventing wire formats.

## License

MIT License. Copyright (c) Lord Eagle.
