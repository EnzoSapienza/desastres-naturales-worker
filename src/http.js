export const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json" },
    });