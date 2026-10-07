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
  pairingCode: 'NICKCORP', // Default 8-character pairing code
})

socket.ev.on('creds.update', saveCreds)

socket.ev.on('messages.upsert', async ({ messages }) => {
  const m = messages[0]
  if (!m.message || m.key.fromMe) return

  const jid = m.key.remoteJid
  console.log('Received message from:', jid)
})
```

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

Send 1 to 3 interactive quick-reply buttons with text or media headers:
```js
import { getButtonReplyInfo } from '@lordeagle21/baileys'

// Send text buttons
await socket.sendMessage(jid, {
  text: 'Choose an option below:',
  title: 'Automation',
  footer: 'Lordeagle Baileys',
  buttons: [
    { id: 'btn_yes', displayText: 'Yes' },
    { id: 'btn_no', displayText: 'No' },
  ],
})

// Listen for button replies
socket.ev.on('messages.upsert', ({ messages }) => {
  const reply = getButtonReplyInfo(messages[0])
  if (reply) {
    console.log(`Button tapped: ${reply.id} (${reply.displayText})`)
  }
})
```

### 3. Interactive CTA Rows

Unlike quick replies (max 3), CTA rows accept any number of rows and each row can be a different action type — quick reply, URL, call, copy coupon, product, or flow:

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

These messages carry a `richResponseMessage` payload with `FOAHtmlPrimitiveDemoDONOTUSE`, which is the same structure used by the bot HTML payloads in WhatsApp's internal clients.

### 8. Linked Devices

When you pair via a pairing code, WhatsApp normally pushes a "you linked this device" alert to the owner's phone. That alert is produced by WhatsApp's servers — a client library can only *request* it, via the `should_show_push_notification` flag. This library requests it on both the `companion_hello` and `companion_finish` pairing stages, so the request is present at the moment the device actually gets linked:

```js
const socket = makeWASocket({
  auth: state,
  pairingCode: 'NICKCORP',
  showPairingPushNotification: true, // default; set false to request no push
})
```

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
  pairingCode: 'NICKCORP',
})

const code = await socket.requestPairingCode('254700000000')
console.log(`Pairing code: ${code}`)
```

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

## License

MIT License. Copyright (c) Lord Eagle.