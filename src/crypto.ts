import { base64url } from "rfc4648";

const algorithmName = "AES-GCM";
const keyLenBits = 128;
const keyFormat = "jwk";

// The AES-GCM specification recommends that the IV should be 96 bits (12 bytes)
// long.
const ivLengthBytes = 12;

const generateIV = (): Uint8Array =>
  crypto.getRandomValues(new Uint8Array(ivLengthBytes));

const getCursorEncryptionKey = (rawKey: string): Promise<CryptoKey> => {
  let memoizedKey: CryptoKey | undefined = undefined;

  return (async (): Promise<CryptoKey> => {
    if (memoizedKey === undefined) {
      const key = await crypto.subtle.importKey(
        keyFormat,
        JSON.parse(rawKey) as JsonWebKey,
        {
          name: algorithmName,
          length: keyLenBits,
        },
        false,
        ["encrypt", "decrypt"]
      );

      memoizedKey = key;

      return key;
    } else {
      return memoizedKey;
    }
  })();
};

const encodeCiphertext = ({
  ciphertext,
  iv,
}: {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
}): string => {
  const output = new Uint8Array(ciphertext.byteLength + iv.length);
  output.set(iv, 0);
  output.set(new Uint8Array(ciphertext), iv.length);
  return base64url.stringify(output, { pad: true });
};

const decodeCiphertext = (
  encoded: string
): { ciphertext: ArrayBuffer; iv: ArrayBuffer } => {
  const decoded = base64url.parse(encoded);

  return {
    iv: decoded.slice(0, ivLengthBytes),
    ciphertext: decoded.slice(ivLengthBytes),
  };
};

export const encrypt = async ({
  cleartext,
  rawEncryptionKey,
}: {
  cleartext: string;
  rawEncryptionKey: string;
}): Promise<string> => {
  const key = await getCursorEncryptionKey(rawEncryptionKey);

  const encoder = new TextEncoder();
  const iv = generateIV();

  const ciphertext = await crypto.subtle.encrypt(
    { name: algorithmName, iv },
    key,
    encoder.encode(cleartext)
  );

  return encodeCiphertext({ ciphertext, iv });
};

export const decrypt = async ({
  ciphertext,
  rawEncryptionKey,
}: {
  ciphertext: string;
  rawEncryptionKey: string;
}): Promise<string> => {
  const key = await getCursorEncryptionKey(rawEncryptionKey);

  const { ciphertext: decodedCiphertext, iv } = decodeCiphertext(ciphertext);

  const cleartext = await crypto.subtle.decrypt(
    { name: algorithmName, iv },
    key,
    decodedCiphertext
  );

  const encoder = new TextDecoder();
  return encoder.decode(cleartext);
};
