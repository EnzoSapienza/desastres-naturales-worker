#!/usr/bin/env node
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import readline from "node:readline/promises";
import fs from "node:fs";

const WORKER_URL = "https://urgent-api.sistemalaertasptr.workers.dev/urgent-post";
const CONFIG_FILE = ".urgent-config.json"; // API_KEY y UID (se piden una sola vez)
const TOKEN_FILE = ".urgent-token.json";   // token en caché
const MARGEN_SEG = 60;                     // renovar 1 min antes de que venza

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ---------- utilidades ----------
const leerJson = (f) => {
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; }
};
const guardarJson = (f, obj) => {
  fs.writeFileSync(f, JSON.stringify(obj, null, 2), { mode: 0o600 });
  fs.chmodSync(f, 0o600);
};
const expDelToken = (t) =>
  JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).exp;

async function preguntarNumero(texto, { min, max } = {}) {
  while (true) {
    const s = (await rl.question(texto)).trim().replace(",", ".");
    const n = Number(s);
    if (s !== "" && Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max))
      return n;
    console.log(`  Valor inválido${min !== undefined ? ` (entre ${min} y ${max})` : ""}.`);
  }
}

async function preguntarTexto(texto, maxLen) {
  while (true) {
    const s = (await rl.question(texto)).trim();
    if (s && s.length <= maxLen) return s;
    console.log(`  Debe tener entre 1 y ${maxLen} caracteres.`);
  }
}

// ---------- configuración ----------
async function cargarConfig() {
  const cfg = leerJson(CONFIG_FILE) ?? {};
  cfg.API_KEY ||= process.env.API_KEY || (await preguntarTexto("API key de Firebase (apiKey): ", 200));
  cfg.UID ||= process.env.UID_FIREBASE || (await preguntarTexto("UID del usuario que publica: ", 128));
  guardarJson(CONFIG_FILE, cfg);
  return cfg;
}

// ---------- token ----------
async function obtenerToken(cfg) {
  const cache = leerJson(TOKEN_FILE);
  const ahora = Math.floor(Date.now() / 1000);
  if (cache?.token && cache.uid === cfg.UID && expDelToken(cache.token) - MARGEN_SEG > ahora) {
    const min = Math.round((expDelToken(cache.token) - ahora) / 60);
    console.log(`Token en caché (vence en ~${min} min).`);
    return cache.token;
  }

  console.log("Generando token nuevo...");
  initializeApp({ credential: cert(JSON.parse(fs.readFileSync("sa.json", "utf8"))) });
  const customToken = await getAuth().createCustomToken(cfg.UID);

  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${cfg.API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const j = await r.json();
  if (!j.idToken) throw new Error("No se pudo obtener el token: " + JSON.stringify(j));

  guardarJson(TOKEN_FILE, { uid: cfg.UID, token: j.idToken });
  return j.idToken;
}

// ---------- envío ----------
async function enviar(token, datos) {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const texto = await res.text();
  let cuerpo;
  try { cuerpo = JSON.stringify(JSON.parse(texto), null, 2); } catch { cuerpo = texto; }
  return { status: res.status, cuerpo };
}

// ---------- programa ----------
try {
  const cfg = await cargarConfig();

  do {
    console.log("\n--- Nueva alerta ---");
    const datos = {
      latitud: await preguntarNumero("Latitud  (ej. -34.72): ", { min: -85, max: 85 }),
      longitud: await preguntarNumero("Longitud (ej. -58.26): ", { min: -180, max: 180 }),
      radio: await preguntarNumero("Radio en km (máx. 100): ", { min: 0.1, max: 100 }),
      tipo: await preguntarTexto("Tipo (ej. inundacion): ", 40),
    };

    console.log("\nSe enviará:", JSON.stringify(datos));
    const ok = (await rl.question("Esto manda un push REAL. ¿Enviar? (s/N): ")).trim().toLowerCase();
    if (ok !== "s") { console.log("Cancelado."); continue; }

    const token = await obtenerToken(cfg);
    let { status, cuerpo } = await enviar(token, datos);

    // Si el token fue rechazado, descartar la caché y reintentar una vez
    if (status === 401) {
      console.log("Token rechazado, renovando...");
      fs.rmSync(TOKEN_FILE, { force: true });
      ({ status, cuerpo } = await enviar(await obtenerToken(cfg), datos));
    }

    console.log(`\nRespuesta HTTP ${status}:`);
    console.log(cuerpo);
  } while ((await rl.question("\n¿Enviar otra? (s/N): ")).trim().toLowerCase() === "s");
} catch (e) {
  console.error("\nError:", e.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
