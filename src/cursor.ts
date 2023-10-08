import { decrypt, encrypt } from "./crypto";

// The deserialized representation of a cursor.
export type Cursor = Readonly<{
  // This is a discriminant in case we want to support sorting by different
  // criteria. Currently, we only support sorting by the artifact ID.
  k: "id";

  // The last value in the previous page. The specific value depends on the
  // discriminant.
  v: string;
}>;

//
// We encrypt the cursor before returning it to the client.
//
// While this is completely unnecessary from a security perspective, it does
// have a few advantages:
//
// 1. We can trivially detect an invalid cursor argument without any complex
// logic or querying the upstream data source.
// 2. The contents of the cursor are opaque to the user, which prevents them
// from trying to interpret or parse it.
// 3. The cursor we return is always different for every request. This prevents
// the user from relying on the contents of the cursor being deterministic.
//

const encodeCursor = async ({
  cursor,
  rawEncryptionKey,
}: {
  cursor: Cursor;
  rawEncryptionKey: string;
}) => encrypt({ cleartext: JSON.stringify(cursor), rawEncryptionKey });

export type DecodeResult = { valid: true; cursor: Cursor } | { valid: false };

export const decodeCursor = async ({
  cursor,
  rawEncryptionKey,
}: {
  cursor: string;
  rawEncryptionKey: string;
}): Promise<DecodeResult> => {
  try {
    return {
      valid: true,
      cursor: JSON.parse(
        await decrypt({ ciphertext: cursor, rawEncryptionKey })
      ),
    };
  } catch (err) {
    console.log(`Failed to decode artifact cursor: ${err}`);
    return { valid: false };
  }
};
