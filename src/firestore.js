// Guarda la alerta y devuelve su id. Lanza error si falla.
export async function saveAlert(env, headers, { latitud, longitud, radio, tipo }) {
    const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${env.PROJECT_ID}/databases/(default)/documents/alertas`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                fields: {
                    latitud: { doubleValue: latitud },
                    longitud: { doubleValue: longitud },
                    radio: { integerValue: radio * 1000},
                    tipo: { stringValue: tipo },
                    createdAt: { timestampValue: new Date().toISOString() },
                },
            }),
        }
    );
    if (!res.ok) {
        console.log("firestore failed:", res.status, await res.text());
        return null;
    }
    return (await res.json()).name.split("/").pop();
}
