import { CELL } from "./config.js";

// Celdas de la cuadrícula que toca el círculo (usa su caja envolvente)
export function cellsForCircle(lat, lon, radioKm) {
    const dLat = radioKm / 111.32;
    const dLon = radioKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    const maxLat = Math.floor(180 / CELL) - 1;
    const maxLon = Math.floor(360 / CELL) - 1;
    const clamp = (v, max) => Math.min(max, Math.max(0, v));

    const latA = clamp(Math.floor((lat - dLat + 90) / CELL), maxLat);
    const latB = clamp(Math.floor((lat + dLat + 90) / CELL), maxLat);
    const lonA = clamp(Math.floor((lon - dLon + 180) / CELL), maxLon);
    const lonB = clamp(Math.floor((lon + dLon + 180) / CELL), maxLon);

    const topics = [];
    for (let i = latA; i <= latB; i++)
        for (let j = lonA; j <= lonB; j++) topics.push(`cell_${i}_${j}`);
    return topics;
}