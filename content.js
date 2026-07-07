// Signal Filter — content script
// Redacts or removes configured keywords from page text, including
// content added dynamically after load.

(async () => {
  const DEFAULTS = {
    enabled: true,
    scrubEnabled: true,
    scrubStyle: "redact",
    keywords: []
  };

  let settings;
  try {
    settings = await chrome.storage.sync.get(DEFAULTS);
  } catch {
    return; // storage unavailable (e.g. extension reloaded)
  }

  if (!settings.enabled || !settings.scrubEnabled) return;

  const keywords = (settings.keywords || [])
    .map((k) => String(k).trim())
    .filter(Boolean);

  if (!keywords.length) return;

  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Whole-word match where the keyword starts/ends with a word character,
  // case-insensitive. Longest keywords first so "some phrase" wins over "phrase".
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  const pattern = sorted
    .map((k) => {
      const esc = escapeRegex(k);
      const lead = /^\w/.test(k) ? "\\b" : "";
      const tail = /\w$/.test(k) ? "\\b" : "";
      return lead + esc + tail;
    })
    .join("|");

  let regex;
  try {
    regex = new RegExp(pattern, "gi");
  } catch {
    return;
  }

  const replaceMatch = (match) =>
    settings.scrubStyle === "remove" ? "" : "█".repeat(Math.max(match.length, 3));

  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT",
    "SELECT", "OPTION", "CODE", "PRE"
  ]);

  function shouldSkip(node) {
    const el = node.parentElement;
    if (!el) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function scrubTextNode(node) {
    if (shouldSkip(node)) return;
    const text = node.nodeValue;
    if (!text) return;
    regex.lastIndex = 0;
    if (!regex.test(text)) return;
    node.nodeValue = text.replace(regex, replaceMatch);
  }

  function scrubTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      scrubTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        shouldSkip(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(scrubTextNode);
  }

  // Also scrub the page <title>.
  function scrubTitle() {
    regex.lastIndex = 0;
    if (regex.test(document.title)) {
      document.title = document.title.replace(regex, replaceMatch);
    }
  }

  // Initial pass
  scrubTree(document.body || document.documentElement);
  scrubTitle();

  // Watch for dynamically-added or changed content (infinite scroll, SPAs, etc.)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "characterData") {
        scrubTextNode(m.target);
      } else {
        m.addedNodes.forEach((n) => scrubTree(n));
      }
    }
    scrubTitle();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
