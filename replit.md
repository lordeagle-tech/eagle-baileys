# Lordeagle Baileys on Replit

This repository is the Lordeagle Baileys Node.js library, designed for automations. It is not a web application, so it has no browser preview. It uses Node.js 20, configured in `.replit`.

The project remains compatible with the Baileys public API. Internal Baileys names and protocol identifiers are intentionally preserved because changing them would break consumers.

## Verify the package

The **Verify package** workflow runs a non-network smoke test. It imports the public package entry point and confirms the socket factory and generated protocol codecs are available; it then exits successfully.

You can run the same check from the Shell:

```sh
npm run prepare
npm run smoke
```

## WhatsApp connections

The smoke test does not authenticate with or connect to WhatsApp. Any application that uses this library must provide and securely persist its own WhatsApp authentication state; do not commit that session data to the repository.