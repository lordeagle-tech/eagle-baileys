# Replit setup

This repository is a Node.js library, not a web application. It uses Node.js 20 (configured in `.replit`) and has no browser preview.

## Verify the package

The **Verify package** workflow runs a non-network smoke test. It imports the public package entry point and confirms the socket factory and generated protocol codecs are available; it then exits successfully.

You can run the same check from the Shell:

```sh
npm run prepare
npm run smoke
```

## WhatsApp connections

The smoke test does not authenticate with or connect to WhatsApp. Any application that uses this library must provide and securely persist its own WhatsApp authentication state; do not commit that session data to the repository.