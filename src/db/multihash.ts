//
// This is what a multihash is:
// https://multiformats.io/multihash/
//

const SHA2_256_NAME = "sha2-256";

// These are the hex string representations of these codes, which are actually
// unsigned varints in the multihash format.
const SHA2_256_CODE = "12";
const LEN_BYTES_32_CODE = "20";

// This doesn't actually implement proper multihash decoding, because we're only
// using one algorithm at the moment. We can reassess if we ever decide to swap
// algorithms.
export const decodeMultihash = (
  multihash: string
): { hash: string; hash_algorithm: string } => {
  const prefix = SHA2_256_CODE + LEN_BYTES_32_CODE;

  if (!multihash.startsWith(prefix)) {
    throw new Error("Tried to decode an unrecognized multihash algorithm");
  }

  return {
    hash: multihash.slice(prefix.length),
    hash_algorithm: SHA2_256_NAME,
  };
};
