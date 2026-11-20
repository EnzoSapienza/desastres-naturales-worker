import { MAX_RADIO_KM } from "./config.js";

// Devuelve los datos limpios o null si la entrada es inválida.
export function validateAlertInput(input) {
    const { latitud, longitud, radio, tipo, nombre, descripcion } = input ?? {};
    const ok =
        Number.isFinite(latitud) && latitud >= -85 && latitud <= 85 &&
        Number.isFinite(longitud) && longitud >= -180 && longitud <= 180 &&
        Number.isFinite(radio) && radio > 0 && radio <= MAX_RADIO_KM &&
        typeof tipo === "string" && tipo.length > 0 && tipo.length <= 40 &&
        typeof nombre === "string" && nombre.length > 0 && nombre.length <= 100 &&
        typeof descripcion === "string" && descripcion.length > 0 && descripcion.length <= 200;

    return ok ? { latitud, longitud, radio, tipo, nombre, descripcion } : null;
}
