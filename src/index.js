import { createRemoteJWKSet, jwtVerify, importPKCS8, SignJWT } from "jose";

const JWKS = createRemoteJWKSet(new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
));

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

let cached = { token: null, exp: 0 };
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (cached.token && cached.exp - 60 > now) return cached.token;

  const key = await importPKCS8(sa.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/cloud-platform" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error("token exchange failed: " + JSON.stringify(j));
  cached = { token: j.access_token, exp: now + j.expires_in };
  return cached.token;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method !== "POST" || url.pathname !== "/urgent-post")
      return json({ error: "not found" }, 404);

    // 1. Verify Firebase ID token
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthenticated" }, 401);
    let claims;
    try {
      ({ payload: claims } = await jwtVerify(auth.slice(7), JWKS, {
        issuer: `https://securetoken.google.com/${env.PROJECT_ID}`,
        audience: env.PROJECT_ID,
      }));
    } catch {
      return json({ error: "invalid token" }, 401);
    }

    // 2. Authorization: company accounts only
    if (claims.role !== "tester") return json({ error: "forbidden" }, 403);

    // 3. Validate input
    let input;
    try { input = await req.json(); } catch { return json({ error: "bad json" }, 400); }
    const { title, body, region } = input;
    if (typeof title !== "string" || !title || title.length > 100 ||
        typeof body !== "string" || body.length > 500 ||
        typeof region !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(region))
      return json({ error: "invalid input" }, 400);

    const sa = JSON.parse(env.SA_JSON);
    const accessToken = await getAccessToken(sa);
    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    // 4. Create the post in Firestore
    const docRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${env.PROJECT_ID}/databases/(default)/documents/posts`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fields: {
            title: { stringValue: title },
            body: { stringValue: body },
            region: { stringValue: region },
            authorId: { stringValue: claims.sub },
            organization: { stringValue: String(claims.organization ?? "") },
            createdAt: { timestampValue: new Date().toISOString() },
          },
        }),
      }
    );
    if (!docRes.ok) return json({ error: "firestore failed", detail: await docRes.text() }, 502);
    const postId = (await docRes.json()).name.split("/").pop();

    // 5. Send the urgent push (one call, topic condition)
    const fcmRes = await fetch(
      `https://fcm.googleapis.com/v1/projects/${env.PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: {
            condition: `'urgent' in topics && 'region_${region}' in topics`,
            notification: { title, body },
            data: { postId },
            android: {
              priority: "HIGH",
              notification: { channel_id: "urgent", sound: "default" },
            },
            apns: {
              headers: { "apns-priority": "10" },
              payload: { aps: { sound: "default", "interruption-level": "time-sensitive" } },
            },
          },
        }),
      }
    );
    if (!fcmRes.ok) return json({ error: "fcm failed", postId, detail: await fcmRes.text() }, 502);

    return json({ ok: true, postId });
  },
};
