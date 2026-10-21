import { ALLOWED_ROLES, MAX_CELLS } from "../config.js";
import { json } from "../http.js";
import { verifyFirebaseToken } from "../auth.js";
import { validateAlertInput } from "../validate.js";
import { cellsForCircle } from "../geo.js";
import { getAccessToken } from "../google-token.js";
import { saveAlert } from "../firestore.js";
import { sendPush } from "../fcm.js";

export async function urgentPost(req, env) {
    // Autenticación
    const { claims, error } = await verifyFirebaseToken(req, env.PROJECT_ID);
    if (error) return json({ error }, 401);

    // Autorización
    if (!ALLOWED_ROLES.includes(claims.role)) return json({ error: "forbidden" }, 403);

    // Validación
    let raw;
    try { raw = await req.json(); } catch { return json({ error: "bad json" }, 400); }
    const data = validateAlertInput(raw);
    if (!data) return json({ error: "invalid input" }, 400);

    const topics = cellsForCircle(data.latitud, data.longitud, data.radio);
    if (topics.length > MAX_CELLS) return json({ error: "area too large" }, 400);

    // Credenciales de Google
    const sa = JSON.parse(env.SA_JSON);
    const accessToken = await getAccessToken(sa);
    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    // Guardar alerta
    const postId = await saveAlert(env, headers, data);
    if (!postId) return json({ error: "storage failed" }, 502);

    // Enviar push
    const { failed, total } = await sendPush(env, headers, topics, { ...data, postId });
    if (failed > 0) return json({ error: "push failed", postId, failed, total }, 502);

    return json({ ok: true, postId, cells: topics.length });
}