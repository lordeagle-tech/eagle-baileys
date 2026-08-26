# Lordeagle Baileys

> A Baileys-compatible WebSocket library designed for automations.

Lordeagle Baileys is an independently maintained fork for developers building WhatsApp Web automations with Node.js. It keeps the familiar Baileys public API while providing a separate package identity and repository for Lord Eagle’s changes.

## Install

```sh
npm install @lordeagle/baileys
```

## Basic usage

```js
import makeWASocket from '@lordeagle/baileys'

const socket = makeWASocket({
  auth: yourAuthState,
})
```

Create and securely persist an authentication state before connecting. Never commit session credentials or generated authentication files to Git.

## Quick-reply buttons

Send one to three quick-reply buttons with unique IDs and labels of up to 20 characters:

```js
await socket.sendMessage('254700000000@s.whatsapp.net', {
  text: 'Would you like to continue?',
  title: 'Automation',
  footer: 'Lordeagle Baileys',
  buttons: [
    { id: 'continue', displayText: 'Continue' },
    { id: 'cancel', displayText: 'Cancel' },
  ],
})
```

Use `getButtonReplyInfo` to read both modern interactive replies and legacy button replies through one stable shape:

```js
import { getButtonReplyInfo } from '@lordeagle/baileys'

socket.ev.on('messages.upsert', ({ messages }) => {
  const reply = getButtonReplyInfo(messages[0])

  if (reply) {
    console.log(reply.id, reply.displayText, reply.type)
  }
})
```

Invalid buttons, duplicate IDs, empty labels, and more than three buttons are rejected before sending.

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