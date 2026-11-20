import { json } from "../http.js";
import { verifyFirebaseToken } from "../auth.js";
import { getAccessToken } from "../google-token.js";

const topicOk = (t) => typeof t === "string" && /^cell_\d{1,4}_\d{1,4}$/.test(t);

export async function subscribe(req, env) {
  const { error } = await verifyFirebaseToken(req, env.PROJECT_ID);
  if (error) return json({ error }, 401);

  let input;
  try { input = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const { token, topic, previous } = input ?? {};
  if (typeof token !== "string" || token.length < 20 || token.length > 4096 ||
      !topicOk(topic) || (previous != null && !topicOk(previous)))
    return json({ error: "invalid input" }, 400);

  const accessToken = await getAccessToken(JSON.parse(env.SA_JSON));

  const call = async (op, t) => {
    const res = await fetch(`https://iid.googleapis.com/iid/v1:${op}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        access_token_auth: "true",
      },
      body: JSON.stringify({ to: `/topics/${t}`, registration_tokens: [token] }),
    });
    const body = await res.text();
    console.log(op, t, res.status, body);
    if (!res.ok) return false;
    try { return !JSON.parse(body).results?.[0]?.error; } catch { return false; }
  };

  if (!(await call("batchAdd", topic))) return json({ error: "subscribe failed" }, 502);
  if (previous && previous !== topic) await call("batchRemove", previous);
  return json({ ok: true });
}
