const WHATSAPP_NUMBER = "2347042224025";

function wireWhatsApp(root) {
  root.querySelectorAll("[data-wa]").forEach((el) => {
    el.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(el.dataset.wa);
    el.target = "_blank"; el.rel = "noopener";
  });
}
wireWhatsApp(document);
document.getElementById("yr").textContent = new Date().getFullYear();

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  kids.forEach((k) => e.append(k));
  return e;
}

async function loadNotices() {
  try {
    const list = await (await fetch("/api/notices")).json();
    const box = document.getElementById("notices");
    box.replaceChildren(...list.slice(0, 3).map((n) => h("p", { textContent: n.text })));
    box.hidden = !list.length;
  } catch (e) {}
}

let products = [], active = "All";
function renderProducts() {
  const cats = ["All", ...new Set(products.map((p) => p.category))];
  document.getElementById("filters").replaceChildren(...cats.map((c) =>
    h("button", { type: "button", textContent: c, className: c === active ? "on" : "", onclick: () => { active = c; renderProducts(); } })));
  const shown = products.filter((p) => active === "All" || p.category === active);
  const grid = document.getElementById("products");
  if (!shown.length) { grid.replaceChildren(h("p", { className: "note", textContent: "New products are on the way. Message us to ask what is in stock." })); return; }
  grid.replaceChildren(...shown.map((p) => {
    const order = h("a", { textContent: "Order on WhatsApp" });
    order.dataset.wa = "Hello, I'd like to order: " + p.name + (p.price ? " (" + p.price + ")" : "");
    const card = h("article", { className: "card" },
      p.image ? h("img", { className: "pimg", src: p.image, alt: p.name, loading: "lazy" }) : h("div", { className: "sw silk" }),
      h("h3", { textContent: p.name }),
      h("p", { className: "price", textContent: p.price }),
      h("p", { textContent: p.description }),
      order);
    wireWhatsApp(card);
    return card;
  }));
}
async function loadProducts() {
  try { products = await (await fetch("/api/products")).json(); } catch (e) { products = []; }
  renderProducts();
}
loadNotices(); loadProducts();
