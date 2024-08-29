# @session.js/bun-network

This network adapter for @session.js/client uses Bun.sh runtime to fetch Session nodes. It exports onRequest method that handles requests

**This package can't be used in browser.** If you want to use it on proxy server for your Session web client, try [@session.js/bun-network-remote](https://github.com/sessionjs/bun-network-remote).

Usage:

```ts
import { BunNetwork } from '@session.js/bun-network'
new Session({ network: new BunNetwork() })
```

Usage with proxy:

```ts
import { BunNetwork } from '@session.js/bun-network'
new Session({ 
  network: new BunNetwork({
    proxy: {
      protocol: 'https',
      username: 'username', // optional
      password: 'password', // optional
      hostname: 'proxy.example.com',
      port: 8080,
    } // or pass string like https://username:password@proxy.example.com:8080
  }) 
})
```

## Made for session.js

Use Session messenger programmatically with [Session.js](https://github.com/sessionjs/client): Session bots, custom Session clients, and more.

## Donate

[hloth.dev/donate](https://hloth.dev/donate)