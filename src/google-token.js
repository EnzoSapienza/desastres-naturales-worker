import { importPKCS8, SignJWT } from "jose";

let cached = { token: null, exp: 0 };

// Access token OAuth2 de la service account (cacheado mientras viva el isolate)
export async function getAccessToken(sa) {
    const now = Math.floor(Date.now() / 1000);
    if (cached.token && cached.exp - 60 > now) return cached.token;

    const key = await importPKCS8(sa.private_key.replace(/\\n/g, "\n"), "RS256");
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