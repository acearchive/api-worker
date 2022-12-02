import { decrypt, encrypt } from "./crypto";

//
// We encrypt the cursor we get from Cloudflare before returning it to the
// client.
//
// While this is most likely unnecessary from a security perspective, it does
// have the advantage that we can easily detect an invalid cursor without having
// to interpret the response we get from KV.
//
// Encrypting the cursor also ensures that it is opaque to the user, so users do
// not try to interpret or parse it.
//

export const encodeCursor = async ({
  cursorFromUpstream,
  rawEncryptionKey,
}: {
  cursorFromUpstream: string;
  rawEncryptionKey: string;
}) => encrypt({ cleartext: cursorFromUpstream, rawEncryptionKey });

export type DecodeResult = { valid: true; decoded: string } | { valid: false };

export const decodeCursor = async ({
  cursorFromUser,
  rawEncryptionKey,
}: {
  cursorFromUser: string;
  rawEncryptionKey: string;
}): Promise<DecodeResult> => {
  try {
    return {
      valid: true,
      decoded: await decrypt({ ciphertext: cursorFromUser, rawEncryptionKey }),
    };
  } catch (err) {
    console.log(`Decoding cursor failed: ${err}`);
    return { valid: false };
  }
};
