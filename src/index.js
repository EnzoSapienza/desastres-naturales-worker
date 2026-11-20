import { json, CORS } from "./http.js";
import { urgentPost } from "./handlers/urgentPost.js";
import { subscribe } from "./handlers/subscribe.js";

export default {
  async fetch(req, env) {
    try {
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

      const url = new URL(req.url);
      if (req.method === "POST" && url.pathname === "/urgent-post")
        return await urgentPost(req, env);
      if (req.method === "POST" && url.pathname === "/subscribe")
        return await subscribe(req, env);
      return json({ error: "not found" }, 404);
    } catch (e) {
      console.log("unhandled:", e.stack || e);
      return json({ error: "internal" }, 500);
    }
  },
};
