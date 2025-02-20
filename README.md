# api-worker

This repo is a [Cloudflare Worker](https://developers.cloudflare.com/workers/)
that serves the Ace Archive API using data from the [Cloudflare
D1](https://developers.cloudflare.com/d1) SQLite database.

See [the website](https://acearchive.lgbt/docs/contributing/api/) for more
information.

## Pagination cursor encryption

Pagination cursors are encrypted, for a few reasons:

1. We can trivially detect an invalid cursor argument without any complex logic
   or querying the upstream data source.
2. The contents of the cursor are opaque to the user, which prevents them from
   trying to interpret or parse it.
3. The cursor we return is always different for every request. This prevents the
   user from relying on the contents of the cursor being deterministic.

The encryption key is stored in a worker secret called `CURSOR_ENCRYPTION_KEY`.
You can generate a key in the browser JS console like this:

```javascript
const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 128 }, true, ["encrypt", "decrypt"])
const jwk = JSON.stringify(await crypto.subtle.exportKey("jwk", key));
console.log(jwk);
```
