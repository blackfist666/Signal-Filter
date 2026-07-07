// Signal Filter — options page logic

const DEFAULTS = {
  enabled: true,
  domains: [],
  redirectUrl: "https://duckduckgo.com",
  scrubEnabled: true,
  scrubStyle: "redact",
  keywords: []
};

const $ = (id) => document.getElementById(id);

let toastTimer;
function toast(msg = "Saved") {
  const el = $("savedToast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1400);
}

function normaliseDomain(input) {
  let d = String(input || "").trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split("/")[0].split(":")[0];
  return d;
}

async function getSettings() {
  return chrome.storage.sync.get(DEFAULTS);
}

async function save(patch, msg) {
  await chrome.storage.sync.set(patch);
  toast(msg);
}

function renderDomains(domains) {
  const list = $("domainList");
  list.innerHTML = "";
  if (!domains.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.style.border = "none";
    li.style.background = "transparent";
    li.textContent = "No sites blocked yet.";
    list.appendChild(li);
    return;
  }
  domains.forEach((d) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = d;
    const btn = document.createElement("button");
    btn.className = "remove";
    btn.textContent = "unblock";
    btn.addEventListener("click", async () => {
      const s = await getSettings();
      const next = s.domains.filter((x) => x !== d);
      await save({ domains: next }, `Unblocked ${d}`);
      renderDomains(next);
    });
    li.append(span, btn);
    list.appendChild(li);
  });
}

function renderKeywords(keywords) {
  const list = $("keywordList");
  list.innerHTML = "";
  if (!keywords.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.style.background = "transparent";
    li.style.color = "var(--ink-dim)";
    li.textContent = "No words redacted yet.";
    list.appendChild(li);
    return;
  }
  keywords.forEach((k) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = k;
    const btn = document.createElement("button");
    btn.className = "remove";
    btn.textContent = "×";
    btn.setAttribute("aria-label", `Stop redacting ${k}`);
    btn.addEventListener("click", async () => {
      const s = await getSettings();
      const next = s.keywords.filter((x) => x !== k);
      await save({ keywords: next }, "Removed");
      renderKeywords(next);
    });
    li.append(span, btn);
    list.appendChild(li);
  });
}

async function init() {
  const s = await getSettings();

  $("enabled").checked = s.enabled;
  $("scrubEnabled").checked = s.scrubEnabled;
  $("scrubStyle").value = s.scrubStyle;
  $("redirectInput").value = s.redirectUrl;
  renderDomains(s.domains);
  renderKeywords(s.keywords);

  $("enabled").addEventListener("change", (e) =>
    save({ enabled: e.target.checked }, e.target.checked ? "Filtering on" : "Filtering off")
  );

  $("scrubEnabled").addEventListener("change", (e) =>
    save({ scrubEnabled: e.target.checked })
  );

  $("scrubStyle").addEventListener("change", (e) =>
    save({ scrubStyle: e.target.value })
  );

  const addDomain = async () => {
    const d = normaliseDomain($("domainInput").value);
    if (!d || !d.includes(".")) return toast("Enter a valid domain");
    const cur = await getSettings();
    if (cur.domains.includes(d)) return toast("Already blocked");
    const next = [...cur.domains, d];
    await save({ domains: next }, `Blocked ${d}`);
    renderDomains(next);
    $("domainInput").value = "";
  };
  $("addDomain").addEventListener("click", addDomain);
  $("domainInput").addEventListener("keydown", (e) => e.key === "Enter" && addDomain());

  $("saveRedirect").addEventListener("click", async () => {
    let url = $("redirectInput").value.trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    try {
      new URL(url);
    } catch {
      return toast("Enter a valid URL");
    }
    $("redirectInput").value = url;
    await save({ redirectUrl: url }, "Destination saved");
  });

  const addKeyword = async () => {
    const k = $("keywordInput").value.trim();
    if (!k) return;
    const cur = await getSettings();
    if (cur.keywords.some((x) => x.toLowerCase() === k.toLowerCase()))
      return toast("Already listed");
    const next = [...cur.keywords, k];
    await save({ keywords: next }, "Word redacted");
    renderKeywords(next);
    $("keywordInput").value = "";
  };
  $("addKeyword").addEventListener("click", addKeyword);
  $("keywordInput").addEventListener("keydown", (e) => e.key === "Enter" && addKeyword());
}

init();
