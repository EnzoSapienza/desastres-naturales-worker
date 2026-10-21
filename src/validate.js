import { MAX_RADIO_KM } from "./config.js";

// Devuelve los datos limpios o null si la entrada es inválida.
export function validateAlertInput(input) {
    const { latitud, longitud, radio, tipo } = input ?? {};
    const ok =
        Number.isFinite(latitud) && latitud >= -85 && latitud <= 85 &&
        Number.isFinite(longitud) && longitud >= -180 && longitud <= 180 &&
        Number.isFinite(radio) && radio > 0 && radio <= MAX_RADIO_KM &&
        typeof tipo === "string" && tipo.length > 0 && tipo.length <= 40;

    return ok ? { latitud, longitud, radio, tipo } : null;
}