import { Env } from ".";
import { ArtifactList } from "./api";
import { decrypt, encrypt } from "./crypto";
import { ArtifactData, toApi } from "./model";

// The deserialized representation of an artifact cursor.
export type ArtifactCursor = Readonly<{
  // The offset of the last artifact in the previous page. You can think of this
  // as the total number of artifacts which have been returned so far across all
  // pages.
  off: number;

  // The artifact ID of the last artifact in the previous page.
  id: string;
}>;

export const unexpectedCursorErrorDetail =
  "Despite the cursor being valid, the next page could not be located. This is likely a server-side bug.";

// This function attempts to cheaply find the index of the next artifact to
// return from the array using the offset stored in the cursor. This should
// handle the 90% case where the list of artifacts in KV isn't changing that
// often.
//
// If the ID of the artifact at the given offset doesn't match the one in the
// cursor, then the list of artifacts in KV has changed in a way that changes
// the offset. In this case, this returns `undefined`.
const findWithCursorCheaplyByIndex = (
  artifacts: ReadonlyArray<ArtifactData>,
  cursor: ArtifactCursor
): number | undefined => {
  if (cursor.off >= artifacts.length) {
    console.log(
      "Offset in cursor is larger than the total number of artifacts, which should never happen. Attempting to query again by comparing artifact IDs."
    );
    return undefined;
  }

  const artifactAtOffset = artifacts[cursor.off];

  if (artifactAtOffset.id === cursor.id) return cursor.off + 1;

  return undefined;
};

// This function finds the index of the next artifact to return by iterating
// through all the artifacts in the array and comparing their artifact IDs with
// the one stored in the cursor.
const findWithCursorExpensivelyById = (
  artifacts: ReadonlyArray<ArtifactData>,
  cursor: ArtifactCursor
): number => {
  console.log(
    "Could not find next page from cursor by offset. Attempting to query again by comparing artifact IDs."
  );

  const indexOfPrevArtifact = artifacts.findIndex(
    (artifact) => artifact.id === cursor.id
  );

  if (indexOfPrevArtifact === -1) {
    // There is no artifact with this ID, presumably because it no longer exists
    // in KV. As of time of writing, artifacts are never removed from KV, and
    // the current plan for implementing deletions is to tag artifacts for
    // deletion instead of removing them from KV.
    //
    // This should never happen, and there is no sane way to recover from this
    // which ensures we don't skip or duplicate artifacts in the next page.
    throw new Error(unexpectedCursorErrorDetail);
  }

  return indexOfPrevArtifact + 1;
};

export const nextPageFromCursor = async ({
  artifacts,
  cursor,
  limit,
  env,
}: {
  artifacts: ReadonlyArray<ArtifactData>;
  cursor?: ArtifactCursor;
  limit: number;
  env: Env;
}): Promise<ArtifactList> => {
  const startIndex =
    cursor === undefined
      ? 0
      : findWithCursorCheaplyByIndex(artifacts, cursor) ??
        findWithCursorExpensivelyById(artifacts, cursor);

  const endIndex = Math.min(startIndex + limit, artifacts.length);
  const nextPage = artifacts.slice(startIndex, endIndex);
  const nextCursor =
    endIndex === artifacts.length
      ? undefined
      : {
          off: endIndex,
          id: nextPage[nextPage.length - 1].id,
        };

  return {
    items: nextPage.map(toApi),
    next_cursor:
      nextCursor === undefined
        ? undefined
        : await encodeCursor({
            cursor: nextCursor,
            rawEncryptionKey: env.CURSOR_ENCRYPTION_KEY,
          }),
  };
};

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
  cursor: ArtifactCursor;
  rawEncryptionKey: string;
}) => encrypt({ cleartext: JSON.stringify(cursor), rawEncryptionKey });

export type DecodeResult =
  | { valid: true; cursor: ArtifactCursor }
  | { valid: false };

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
