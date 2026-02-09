/**
 * Split EIP-712 signature (65 bytes: r + s + v) for 0x submit format
 * wagmi/viem signTypedData returns hex like: 0x + r(64) + s(64) + v(2)
 */
import type { Hex } from "viem";

export const SignatureType = {
  EIP712: 2,
} as const;

export function splitSignature(signatureHex: Hex): {
  r: string;
  s: string;
  v: number;
} {
  const hex = signatureHex.startsWith("0x") ? signatureHex.slice(2) : signatureHex;
  if (hex.length < 130) {
    throw new Error("Invalid signature length");
  }
  const r = "0x" + hex.slice(0, 64).padStart(64, "0");
  const s = "0x" + hex.slice(64, 128).padStart(64, "0");
  const vHex = hex.slice(128, 130);
  let v = parseInt(vHex, 16);
  // EIP-155: v is 27 or 28; some signers return 0/1
  if (v < 27) v += 27;
  return { r, s, v };
}
