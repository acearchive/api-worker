import { decrypt, encrypt } from "./crypto";
import { InvalidCursor } from "./response";
import hash from "object-hash";
import { SortDirection, SortOrder } from "./db/multiple";

type QueryParamHash = string;

// The deserialized representation of a cursor.
export type Cursor = Readonly<{
  // The artifact ID of the last value in the previous page.
  id: string;

  // A hash of the sort/filter query params passed in the previous query. We use
  // this to ensure that the sorting and filtering params do not change between
  // pages, as the expected behavior in that case would be difficult to reason
  // about. If the sort/filter query params change between pages, we return an
  // error response.
  params: QueryParamHash;
}>;

export const hashQueryParams = ({
  sort,
  direction,
  identities,
  people,
  decades,
}: {
  sort: SortOrder;
  direction: SortDirection;
  identities?: string;
  people?: string;
  decades?: string;
}): QueryParamHash =>
  // The order of the properties in this object is unimportant; they're sorted
  // for us before they're hashed. We truncate this hash to the first 32 bits to
  // keep the cursor small.
  hash(
    { sort, direction, identities, people, decades },
    { algorithm: "sha1", unorderedObjects: true, encoding: "hex" }
  ).slice(0, 8);

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

export const encodeCursor = async ({
  cursor,
  rawEncryptionKey,
}: {
  cursor: Cursor;
  rawEncryptionKey: string;
}) => encrypt({ cleartext: JSON.stringify(cursor), rawEncryptionKey });

export const decodeCursor = async ({
  cursor,
  rawEncryptionKey,
}: {
  cursor: string;
  rawEncryptionKey: string;
}): Promise<Cursor> => {
  try {
    return JSON.parse(await decrypt({ ciphertext: cursor, rawEncryptionKey }));
  } catch (err) {
    console.log(`Failed to decode artifact cursor: ${err}`);
    throw InvalidCursor(cursor ?? "");
  }
};
