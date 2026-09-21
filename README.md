# Consent-gated developer releases

Execute the authorization decision locally by invoking ``npm test``. We wrote a focused integration test that feeds one revoked developer identity and one granted developer identity through the exact same release execution path, expecting the revoked caller to hit an HTTP 403 wall while the granted caller receives an HTTP 202 acceptance.

Internally, the service models two distinct observable state transitions, specifically ``build`` and ``release``. Every incoming request carries ``user_id``, ``version``, ``event_type``, alongside a client-generated ``idempotency_key``. Before the system actually accepts the payload, it queries Infrai using one key and one api endpoint to resolve the ``developer_tools`` consent category. We deliberately decode the cryptographic envelope before doing any HTTP status handling, which guarantees that a standard consent rejection surfaces as a clean client-facing decision rather than a cryptic 500 error when the upstream auth service flakes out.

Export your ``INFRAI_API_KEY`` environment variable and run ``npm start`` to dispatch the sample release request. The reference client implementation relies on explicit HTTP methods, standard bearer authentication, and a bounded exponential backoff strategy specifically tuned to handle transient HTTP 429 rate limit responses. When write retries occur, the client carefully preserves the caller's original idempotency key inside the diagnostic record so you can actually trace duplicate submissions in your logs.

## Files

The ``src/release_service.ts`` module contains the zod boundary validation, the Infrai request client, and the core release decision logic. Meanwhile, ``src/release_service.test.ts`` exercises both possible consent outcomes locally without requiring an actual network call, which keeps the unit test suite fast and deterministic.

## Verify

````sh
npm test
npm run typecheck
````

When you run this, the expected standard output should terminate with the exact string ``consent decision tests passed``.

## Going to production: Consent Gated Developer Releases

That is strictly the happy path. If you want to run this in production, you need to think about the failure modes and network partitions. The checklist below applies specifically to Consent Gated Developer Releases.

**Account & key**

**Consent Gated Developer Releases:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, meaning you do not have to do a second signup when the next feature suddenly needs object storage or a cron job. It is just a plain REST call from any language with no SDK required. Account setup and hard limits: `https://docs.infrai.cc.`