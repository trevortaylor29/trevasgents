// eBay Marketplace Account Deletion notification endpoint.
//
// Two protocols on this one URL:
//   GET  ?challenge_code=<x>  → verification handshake.
//     Compute sha256(challenge_code + verification_token + endpoint_url),
//     return {challengeResponse: "<hex>"}.
//   POST <deletion event body> → eBay notifies us a user closed their account.
//     We have NO user PII to delete (Craig scans aggregate prices, not buyers),
//     so we log + 200 OK.
//
// Spec: https://developer.ebay.com/marketplace-account-deletion
//
// The verification token is NOT cryptographically secret — it's a shared salt
// eBay uses to confirm the endpoint owner controls both the URL and the token
// they pasted on developer.ebay.com. Both eBay and us know it; the hash binds
// the request to (challenge, token, url). Hardcoding is acceptable here because
// the security impact of a forged deletion notification is zero (we store no
// user data to mistakenly delete).

import crypto from "node:crypto";
import { NextResponse } from "next/server";

const VERIFICATION_TOKEN = "G70QbV3yRzOtlLz800fvmv4Mpei6f3X9xGoKmcnOl8-TFhY7";
const ENDPOINT_URL = "https://trevsagents.com/api/ebay-deletion";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challengeCode = searchParams.get("challenge_code");

  if (!challengeCode) {
    return NextResponse.json(
      { error: "missing challenge_code query parameter" },
      { status: 400 }
    );
  }

  // eBay's spec: SHA256(challenge_code + verification_token + endpoint_url), hex.
  const hash = crypto.createHash("sha256");
  hash.update(challengeCode);
  hash.update(VERIFICATION_TOKEN);
  hash.update(ENDPOINT_URL);
  const challengeResponse = hash.digest("hex");

  return NextResponse.json({ challengeResponse });
}

export async function POST(req: Request) {
  // We have no user PII to delete (read-only aggregate price scanner).
  // Acknowledge with 200 OK per spec. Body shape from eBay docs:
  //   { metadata: {...}, notification: { data: { username, userId, eiasToken } } }
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  // Log to Vercel function logs for audit trail.
  console.log("[ebay-deletion] notification received:", JSON.stringify(body));

  return NextResponse.json({ ok: true });
}
