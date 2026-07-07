// Signal Filter — background service worker
// Builds declarativeNetRequest dynamic rules from the user's blocklist.

const DEFAULTS = {
  enabled: true,
  domains: [],
  redirectUrl: "https://duckduckgo.com",
  scrubEnabled: true,
  scrubStyle: "redact", // "redact" (█████) or "remove"
  keywords: []
};

// Ensure defaults exist on first install without clobbering user settings.
async function ensureDefaults() {
  const stored = await chrome.storage.sync.get(null);
  const merged = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    merged[key] = stored[key] !== undefined ? stored[key] : value;
  }
  await chrome.storage.sync.set(merged);
  return merged;
}

function normaliseDomain(input) {
  let d = String(input || "").trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split("/")[0].split(":")[0];
  return d;
}

function validRedirect(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

async function rebuildRules() {
  const settings = await chrome.storage.sync.get(DEFAULTS);

  // Remove every existing dynamic rule first.
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  let addRules = [];
  const redirectUrl = validRedirect(settings.redirectUrl)
    ? settings.redirectUrl
    : DEFAULTS.redirectUrl;

  if (settings.enabled) {
    const domains = [...new Set(settings.domains.map(normaliseDomain).filter(Boolean))];
    addRules = domains.map((domain, i) => ({
      id: i + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { url: redirectUrl }
      },
      condition: {
        // requestDomains matches the domain and all of its subdomains
        requestDomains: [domain],
        resourceTypes: ["main_frame"]
      }
    }));
  }

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });

  // Badge shows how many domains are actively blocked.
  const count = settings.enabled ? addRules.length : 0;
  chrome.action.setBadgeText({ text: count ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#1B2129" });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await ensureDefaults();
  await rebuildRules();
  // First install: take the user straight to settings to set up their filters.
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onStartup.addListener(rebuildRules);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.domains || changes.redirectUrl || changes.enabled) {
    rebuildRules();
  }
});
