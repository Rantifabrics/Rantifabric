const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem("eclat_token");

async function api(path, opts = {}) {
  const res = await fetch("/api/" + path, {
    ...opts,
    headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) { logout(); }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function row(text, onDelete, imgSrc) {
  const li = document.createElement("li");
  if (imgSrc) { const i = document.createElement("img"); i.src = imgSrc; i.alt = ""; li.append(i); }
  const s = document.createElement("span"); s.textContent = text;
  const b = document.createElement("button"); b.type = "button"; b.textContent = "Delete"; b.onclick = onDelete;
  li.append(s, b);
  return li;
}

async function refresh() {
  const [notices, products] = await Promise.all([api("notices"), api("products")]);
  $("nlist").replaceChildren(...notices.map((n) => row(n.text, async () => { await api("notices/" + n.id, { method: "DELETE" }); refresh(); })));
  $("plist").replaceChildren(...products.map((p) =>
    row(p.name + " (" + p.category + ")" + (p.price ? " · " + p.price : ""),
      async () => { if (confirm("Delete " + p.name + "?")) { await api("products/" + p.id, { method: "DELETE" }); refresh(); } },
      p.image)));
}

function show() {
  $("login").hidden = !!token;
  $("dash").hidden = !token;
  if (token) refresh().catch(() => {});
}
function logout() { token = null; sessionStorage.removeItem("eclat_token"); show(); }

$("login").onsubmit = async (e) => {
  e.preventDefault();
  $("loginMsg").textContent = "";
  try {
    const r = await api("login", { method: "POST", body: JSON.stringify({ password: $("pw").value }) });
    token = r.token; sessionStorage.setItem("eclat_token", token); $("pw").value = ""; show();
  } catch (err) { $("loginMsg").textContent = err.message; }
};
$("out").onclick = logout;

$("notice").onsubmit = async (e) => {
  e.preventDefault();
  try { await api("notices", { method: "POST", body: JSON.stringify({ text: $("ntext").value }) }); $("ntext").value = ""; refresh(); }
  catch (err) { alert(err.message); }
};

function resize(file, max = 1000) {
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = no;
    img.src = URL.createObjectURL(file);
  });
}

$("pimg").onchange = async () => {
  const f = $("pimg").files[0];
  if (!f) { $("prev").hidden = true; return; }
  $("prev").src = await resize(f, 400); $("prev").hidden = false;
};

$("product").onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.submitter; btn.disabled = true; $("pmsg").textContent = "Uploading...";
  try {
    const f = $("pimg").files[0];
    const image = f ? await resize(f) : null;
    await api("products", { method: "POST", body: JSON.stringify({
      name: $("pname").value, category: $("pcat").value, price: $("pprice").value,
      description: $("pdesc").value, image }) });
    e.target.reset(); $("prev").hidden = true; $("pmsg").textContent = "Product added.";
    refresh();
  } catch (err) { $("pmsg").textContent = err.message; }
  btn.disabled = false;
};
show();
