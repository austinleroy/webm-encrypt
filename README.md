Tool for encrypting and decrypting [WebM][webm] files.  Provides a CLI and a [Transform][node-transform] implementation.

# Install

```bash
# Install via NPM locally:
npm install --save webm-encrypt

# Install globally (for CLI use):
npm install --global webm-encrypt
```

# Usage

## CLI 

```bash

# Encrypt a webm file
webme -i input.webm -o output.webm

# Encrypt a webm file with a specific key
webme -i input.webm -o output.webm -k keyfile.key

# Decrypt a webm file
webme -d -i encrypted.webm -o decrypted.webm -k keyfile.key

```

> _Note on keys:_ The [WebM Encryption Specification][webm-encryption-spec] states that the key size for encryption must be 128 bit[*][webm-key-size].  Consequently, the key file used must be 16 bytes (128 bits) of binary data.

## Code

`webm-encrypt` was written to quickly and easily encrypt or decrypt [WebM][webm] binary data.  Encrypting and decrypting a file using nodejs is as easy as:

```js
const { WebmStreamEncryptor } = require('webm-encrypt');
const fs = require('fs');
const crypto = require('crypto');
const { pipeline } = require('stream');

// Generate a random encryption key
let key = new Uint8Array(16);
crypto.randomFillSync(key);

pipeline(
    // Create the read stream for the original file
    fs.createReadStream('input.webm'),
    // Use the Transform from webm-encrypt to encrypt the file data
    new WebmStreamEncryptor('encrypt', key),
    // Write the encrypted file stream to disk
    fs.createWriteStream('encrypted.webm')
).on('close', () => {
    // After the file is written, decrypt the file to a new location
    pipeline(
    fs.createReadStream('encrypted.webm'),
    new WebmStreamEncryptor('decrypt', key),
    fs.createWriteStream('decrypted.webm')
    )
});

```

For reference, be sure to check out [Node Transform Streams][node-transform]!

[webm]: https://www.webmproject.org/
[node-transform]: https://nodejs.org/api/stream.html#stream_class_stream_transform
[webm-encryption-spec]: https://www.webmproject.org/docs/webm-encryption/
[webm-key-size]: https://www.webmproject.org/docs/webm-encryption/#41-common-encryption-format