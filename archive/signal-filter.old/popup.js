const DEFAULTS = { enabled: true, domains: [], keywords: [] };

async function init() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  const toggle = document.getElementById("enabled");
  toggle.checked = s.enabled;
  document.getElementById("stats").textContent =
    `${s.domains.length} sites blocked · ${s.keywords.length} words redacted`;

  toggle.addEventListener("change", (e) =>
    chrome.storage.sync.set({ enabled: e.target.checked })
  );

  document.getElementById("openOptions").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

init();
