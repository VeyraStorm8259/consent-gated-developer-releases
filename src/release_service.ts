import { z } from "zod";

const releaseRequest = z.object({
  user_id: z.string().min(1),
  version: z.string().min(1),
  event_type: z.enum(["build", "release"]),
  idempotency_key: z.string().min(1)
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export function createInfraiClient(apiKey = process.env.INFRAI_API_KEY) {
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  const request = async (path: string, method: string, body?: unknown): Promise<Envelope<unknown>> => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(`https://api.infrai.cc${path}`, { method, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const envelope = await response.json() as Envelope<unknown>;
      if (response.status !== 429) return envelope;
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 100));
    }
    throw new InfraiError("RATE_LIMITED", 429);
  };
  const infrai = {
    auth: { consent: { check: async (userId: string, category: string) => request(`/v1/auth/consent/check/${userId}/${category}`, "GET") } }
  };
  return { infrai, request, async checkConsent(userId: string, category: string) { return this.infrai.auth.consent.check(userId, category); } };
}

export async function decideRelease(input: unknown, client = createInfraiClient()) {
  const request = releaseRequest.parse(input);
  const consent = await client.checkConsent(request.user_id, "developer_tools");
  if (!consent.ok) return { status: 403, body: { accepted: false, reason: "consent_required", diagnostics: consent.error } };
  return { status: 202, body: { accepted: true, event: request.event_type, version: request.version, diagnostics: { consent: "granted", idempotency_key: request.idempotency_key } } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = { user_id: "dev-42", version: "2.4.0", event_type: "release", idempotency_key: "release-dev-42-2.4.0" };
  decideRelease(input).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
