export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json", ...CORS },
    });
