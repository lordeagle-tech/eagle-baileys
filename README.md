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

### 3. Pairing Code

Connect without scanning a QR code using an 8-character pairing code:

```js
const socket = makeWASocket({
  auth: state,
  pairingCode: 'NICKCORP',
})

const code = await socket.requestPairingCode('254700000000')
console.log(`Pairing code: ${code}`)
```

### 4. JID Normalization & Aliases

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