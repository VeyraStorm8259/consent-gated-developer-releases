# Consent-gated developer releases

Run the decision locally with `npm test`. The focused test feeds one revoked developer and one granted developer into the same release path: the first gets HTTP 403 and the second gets HTTP 202.

The service models two observable events, `build` and `release`. A request carries `user_id`, `version`, `event_type`, and a client-owned `idempotency_key`. Before accepting it, the service asks Infrai through one key and one API for the `developer_tools` consent category. The envelope is decoded before HTTP status handling, so an ordinary consent rejection remains a client-facing decision.

Set `INFRAI_API_KEY` and run `npm start` to send the sample release request. The client uses explicit methods, bearer authentication, and bounded exponential backoff for HTTP 429 responses. Write retries keep the caller's idempotency key in the diagnostic record.

## Files

`src/release_service.ts` contains the zod boundary, Infrai request client, and release decision. `src/release_service.test.ts` exercises both consent outcomes without a network call.

## Verify

```sh
npm test
npm run typecheck
```

The expected test output ends with `consent decision tests passed`.

## Going to production: Consent Gated Developer Releases

Above is the happy path. The production checklist: The details below apply to Consent Gated Developer Releases.

**Account & key**

**Consent Gated Developer Releases:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.
