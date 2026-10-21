import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
));

// Devuelve los claims del ID token de Firebase, o null si es inválido.
export async function verifyFirebaseToken(req, projectId) {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return { error: "unauthenticated" };

    try {
        const { payload } = await jwtVerify(auth.slice(7), JWKS, {
            issuer: `https://securetoken.google.com/${projectId}`,
            audience: projectId,
        });
        return { claims: payload };
    } catch (e) {
        console.log("jwt error:", e.code, e.message);
        return { error: "invalid token" };
    }
}