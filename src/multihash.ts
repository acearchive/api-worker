//
// This is what a multihash is:
// https://multiformats.io/multihash/
//

import { decode } from "multiformats/hashes/digest";
import { base16 } from "rfc4648";

interface Algorithm {
  name: string;
  code: number;
  len: number;
}

// The code and name come from the multicodec table:
// https://github.com/multiformats/multicodec/blob/master/table.csv
const sha256: Algorithm = {
  name: "sha2-256",
  code: 0x12,
  len: 32,
};

export const decodeMultihash = (
  multihash: string
): { hash: string; hash_algorithm: string } => {
  const digest = decode(base16.parse(multihash));

  if (digest.code === sha256.code && digest.size === sha256.len) {
    return {
      hash: base16.stringify(digest.digest).toLowerCase(),
      hash_algorithm: sha256.name,
    };
  } else {
    throw new Error(
      "Tried to decode a multihash with an unrecognized algorithm. This is a bug."
    );
  }
};
