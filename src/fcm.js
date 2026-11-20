import { TOPICS_PER_CONDITION } from "./config.js";

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

// Envía el push a todos los topics. Devuelve { failed, total }.
export async function sendPush(env, headers, topics, { postId, latitud, longitud, radio, tipo, nombre, descripcion }) {
    const chunks = chunk(topics, TOPICS_PER_CONDITION);

    const results = await Promise.all(chunks.map(async (c) => {
        const res = await fetch(
            `https://fcm.googleapis.com/v1/projects/${env.PROJECT_ID}/messages:send`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    message: {
                        condition: c.map((t) => `'${t}' in topics`).join(" || "),
                        notification: { title: nombre, body: descripcion },
                        data: {
                            postId,
                            tipo,
                            latitud: String(latitud),
                            longitud: String(longitud),
                            radio: String(radio),
                            nombre: String(nombre),
                            descripcion: String(descripcion),
                        },
                        android: {
                            priority: "HIGH",
                            notification: { channel_id: "urgent", sound: "default" },
                        },
                        apns: {
                            headers: { "apns-priority": "10" },
                            payload: { aps: { sound: "default", "interruption-level": "time-sensitive" } },
                        },
                        webpush: {
                            headers: { Urgency: "high" },
                        },
                    },
                }),
            }
        );
        const textoFcm = await res.text();
        console.log("fcm", res.status, textoFcm);
        return res.ok;
    }));

    return { failed: results.filter((ok) => !ok).length, total: chunks.length };
}
