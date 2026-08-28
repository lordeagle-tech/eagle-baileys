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

## Basic usage

```js
import makeWASocket from '@lordeagle21/baileys'

const socket = makeWASocket({
  auth: yourAuthState,
})
```

Create and securely persist an authentication state before connecting. Never commit session credentials or generated authentication files to Git.

## Pairing code

The default pairing code is the fixed eight-character code `NICKCORP`. You can
change it globally in the socket configuration or override it for one request:

```js
const socket = makeWASocket({
  auth: yourAuthState,
  pairingCode: 'MYCODE12',
})

await socket.requestPairingCode('254700000000')
// Or: await socket.requestPairingCode('254700000000', 'MYCODE12')
```

Pairing codes must be exactly eight characters. A fixed code is less secure
than a randomly generated, one-time code, so use a private value and change it
if it becomes known.

## Connection Monitoring

Lordeagle Baileys provides built-in utilities to monitor and check socket connections to WhatsApp:

```js
// Check the connection state dynamically
console.log(socket.connectionState) // 'connecting', 'open', or 'close'
console.log(socket.isConnected)     // true if open

// Explicitly check responsiveness by pinging the WhatsApp server
try {
  await socket.ping(5000) // 5s timeout
  console.log('Connection is alive and healthy!')
} catch (error) {
  console.error('Connection is down or unresponsive:', error)
}
```

## Quick-reply buttons

Send one to three quick-reply buttons with unique IDs and labels of up to 20 characters. You can send plain text buttons or enhance them with media headers (images, video, documents, location, or product):

```js
// Text-only buttons
await socket.sendMessage('254700000000@s.whatsapp.net', {
  text: 'Would you like to continue?',
  title: 'Automation',
  footer: 'Lordeagle Baileys',
  buttons: [
    { id: 'continue', displayText: 'Continue' },
    { id: 'cancel', displayText: 'Cancel' },
  ],
})

// Media-enhanced buttons (e.g. Image buttons)
await socket.sendMessage('254700000000@s.whatsapp.net', {
  image: { url: 'https://example.com/image.jpg' },
  caption: 'Here is your report. Would you like to download?',
  footer: 'Report Bot',
  buttons: [
    { id: 'download_pdf', displayText: 'Download PDF' },
    { id: 'dismiss', displayText: 'Dismiss' },
  ],
})
```

Use `getButtonReplyInfo` to read both modern interactive replies and legacy button replies through one stable shape:

```js
import { getButtonReplyInfo } from '@lordeagle21/baileys'

socket.ev.on('messages.upsert', ({ messages }) => {
  const reply = getButtonReplyInfo(messages[0])

  if (reply) {
    console.log(reply.id, reply.displayText, reply.type)
  }
})
```

Invalid buttons, duplicate IDs, empty labels, and more than three buttons are rejected before sending.

### Live client verification

The automated tests validate the protocol shape without contacting WhatsApp. Live verification needs two test accounts: a sender account paired to this project and a different recipient account where you can open the current WhatsApp clients.

Pair the sender once. Use its phone number with country code and digits only (no `+`, spaces, or punctuation):

```sh
BAILEYS_LIVE_BUTTON_TEST=1 \
BAILEYS_BUTTON_TEST_SENDER_PHONE=254711111111 \
BAILEYS_BUTTON_TEST_AUTH_DIR=.button-test-auth \
npm run test:buttons:pair
```

The terminal prints a temporary pairing code. On the sender phone, open **WhatsApp > Linked devices > Link a device > Link with phone number instead**, enter the code, and wait for the terminal to confirm that pairing completed. Treat the code and `.button-test-auth` directory as credentials: do not share them or commit them.

Then send the button message to the separate recipient account:

```sh
BAILEYS_LIVE_BUTTON_TEST=1 \
BAILEYS_BUTTON_TEST_RECIPIENT=254722222222@s.whatsapp.net \
BAILEYS_BUTTON_TEST_AUTH_DIR=.button-test-auth \
npm run test:buttons:live
```

Open the recipient chat on the client being checked, confirm that both buttons are visible, and tap one. The terminal checks the reply ID and label through `getButtonReplyInfo`. To require a particular click, add `BAILEYS_BUTTON_TEST_EXPECTED_ID=continue` or `BAILEYS_BUTTON_TEST_EXPECTED_ID=cancel`. Repeat the send command for Android, iPhone, Web, and Desktop. The recipient must be a test account you control; the test refuses groups, channels, broadcasts, and unregistered sessions.

For each run, record the result on the client where the recipient tapped the button:

| Client | Rendered two buttons | Click produced the expected ID and label | Reply type |
| --- | --- | --- | --- |
| Android | ☐ | ☐ | `interactive` / `legacy` / `template` |
| iPhone | ☐ | ☐ | `interactive` / `legacy` / `template` |
| Web | ☐ | ☐ | `interactive` / `legacy` / `template` |
| Desktop | ☐ | ☐ | `interactive` / `legacy` / `template` |

The current interactive native-flow format is intended for supported, up-to-date WhatsApp clients; obsolete clients may not show clickable buttons or may return a legacy/template response. The default API validation remains unchanged: only one to three buttons, unique non-empty IDs, non-empty message text, and labels of at most 20 characters are accepted. Use the normalized reply helper rather than depending on a client-specific response type.

## Explicit channel and group actions

Lordeagle Baileys does not automatically follow channels or join groups. Channel follows and group joins only occur when your application explicitly calls methods such as `newsletterFollow` or `groupAcceptInvite`.

`presenceSubscribe` is restricted to individual user JIDs. Passing a group, channel, or status JID throws an error instead of sending a subscription request.

## Development

This repository requires Node.js 20 or newer.

```sh
npm install
npm run prepare
npm test
npm run smoke
```

The smoke test imports the public package entry point and verifies that the socket factory and generated protocol codecs are available. It does not connect to WhatsApp or require account credentials.

The longer upstream usage guide is preserved in [`README.upstream.md`](./README.upstream.md) as a reference for supported Baileys APIs.

## Disclaimer

This project is not affiliated with, authorized by, endorsed by, or officially connected with WhatsApp or its subsidiaries. Use it responsibly and in accordance with WhatsApp’s terms and applicable law. Do not use it for spam, stalking, or other abusive automation.

## License and attribution

Lordeagle Baileys is distributed under the MIT License. It is based on the open-source Baileys project and retains the original copyright and license notices. See [`LICENSE`](./LICENSE) for details.