import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

initializeApp({ credential: cert(JSON.parse(fs.readFileSync("sa.json", "utf8"))) });

const uid = process.argv[2];
const customToken = await getAuth().createCustomToken(uid);

const r = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  }
);
const j = await r.json();
console.log(j.idToken ?? j);
