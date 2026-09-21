import assert from "node:assert/strict";
import { createInfraiClient, decideRelease } from "./release_service.js";

const denied = await decideRelease(
  { user_id: "dev-7", version: "1.0.0", event_type: "release", idempotency_key: "r-1" },
  { checkConsent: async () => ({ ok: false, error: { message: "consent missing" } }) } as never
);
assert.equal(denied.status, 403);
assert.equal(denied.body.accepted, false);

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(
  JSON.stringify({ ok: false, error: { code: "CONSENT_REQUIRED", message: "consent missing" } }),
  { status: 403, headers: { "content-type": "application/json" } }
);
try {
  const clientDenied = await decideRelease(
    { user_id: "dev-7", version: "1.0.0", event_type: "release", idempotency_key: "r-2" },
    createInfraiClient("test-key")
  );
  assert.equal(clientDenied.status, 403);
  assert.equal(clientDenied.body.accepted, false);
} finally {
  globalThis.fetch = originalFetch;
}

const allowed = await decideRelease(
  { user_id: "dev-7", version: "1.0.0", event_type: "build", idempotency_key: "b-1" },
  { checkConsent: async () => ({ ok: true, data: { granted: true } }) } as never
);
assert.equal(allowed.status, 202);
assert.equal(allowed.body.accepted, true);
console.log("consent decision tests passed");
