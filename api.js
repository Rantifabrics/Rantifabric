import { getStore } from "@netlify/blobs";
import { createHmac, createHash, timingSafeEqual, randomUUID } from "node:crypto";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const sign = (p) => createHmac("sha256", process.env.TOKEN_SECRET).update(p).digest("base64url");
const sha = (s) => createHash("sha256").update(String(s)).digest();

function makeToken() {
  const p = String(Date.now() + 12 * 3600 * 1000); // valid 12 hours
  return p + "." + sign(p);
}
function isAdmin(req) {
  const t = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const [p, s] = t.split(".");
  if (!p || !s) return false;
  const a = Buffer.from(s), b = Buffer.from(sign(p));
  return a.length === b.length && timingSafeEqual(a, b) && Number(p) > Date.now();
}
const clean = (v, n) => String(v || "").trim().slice(0, n);
const safeId = (v) => /^[a-zA-Z0-9-]{1,60}$/.test(v || "") ? v : null;

export default async (req) => {
  if (!process.env.ADMIN_PASSWORD || !process.env.TOKEN_SECRET)
    return json({ error: "Server not configured. Set ADMIN_PASSWORD and TOKEN_SECRET in Netlify." }, 500);

  const url = new URL(req.url);
  const [resource, rawId] = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const id = safeId(rawId);
  const m = req.method;
  const store = getStore("eclat");
  const read = async (k) => (await store.get(k, { type: "json" })) || [];

  try {
    if (resource === "login" && m === "POST") {
      const { password } = await req.json();
      const ok = timingSafeEqual(sha(password), sha(process.env.ADMIN_PASSWORD));
      return ok ? json({ token: makeToken() }) : json({ error: "Wrong password." }, 401);
    }

    if (resource === "image" && m === "GET" && id) {
      const buf = await store.get("img-" + id, { type: "arrayBuffer" });
      if (!buf) return new Response("Not found", { status: 404 });
      return new Response(buf, {
        headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" },
      });
    }

    if (resource === "products") {
      if (m === "GET") return json(await read("products"));
      if (!isAdmin(req)) return json({ error: "Please log in again." }, 401);

      if (m === "POST") {
        const b = await req.json();
        const name = clean(b.name, 120);
        if (!name) return json({ error: "Product name is required." }, 400);
        const pid = randomUUID();
        let image = null;
        const match = /^data:image\/\w+;base64,(.+)$/.exec(b.image || "");
        if (match) {
          const buf = Buffer.from(match[1], "base64");
          if (buf.length > 3 * 1024 * 1024) return json({ error: "Image too large." }, 400);
          await store.set("img-" + pid, buf);
          image = "/api/image/" + pid;
        }
        const list = await read("products");
        const item = {
          id: pid, name, category: clean(b.category, 40) || "Other",
          price: clean(b.price, 60), description: clean(b.description, 500),
          image, created: Date.now(),
        };
        list.unshift(item);
        await store.setJSON("products", list);
        return json(item, 201);
      }

      if (m === "DELETE" && id) {
        const list = (await read("products")).filter((p) => p.id !== id);
        await store.setJSON("products", list);
        await store.delete("img-" + id);
        return json({ ok: true });
      }
    }

    if (resource === "notices") {
      if (m === "GET") return json(await read("notices"));
      if (!isAdmin(req)) return json({ error: "Please log in again." }, 401);

      if (m === "POST") {
        const b = await req.json();
        const text = clean(b.text, 240);
        if (!text) return json({ error: "Notification text is required." }, 400);
        const list = await read("notices");
        const item = { id: randomUUID(), text, created: Date.now() };
        list.unshift(item);
        await store.setJSON("notices", list.slice(0, 20));
        return json(item, 201);
      }
      if (m === "DELETE" && id) {
        await store.setJSON("notices", (await read("notices")).filter((n) => n.id !== id));
        return json({ ok: true });
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: "Something went wrong. Try again." }, 500);
  }
};

export const config = { path: "/api/*" };
