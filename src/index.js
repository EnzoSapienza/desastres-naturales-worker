import { json } from "./http.js";
import { urgentPost } from "./handlers/urgentPost.js";

export default {
  async fetch(req, env) {
    try {
      const url = new URL(req.url);
      if (req.method === "POST" && url.pathname === "/urgent-post")
        return await urgentPost(req, env);
      return json({ error: "not found" }, 404);
    } catch (e) {
      console.log("unhandled:", e.stack || e);
      return json({ error: "internal" }, 500);
    }
  },
};