# Signal Filter

A personal content-filtering extension for Chrome / Edge / Brave (Manifest V3).

- **Block sites** — any domain on your list (including all subdomains) is intercepted before it loads and redirected to a destination of your choice (default: Google).
- **Redact words** — any word or phrase on your list is blacked out (█████) or removed entirely from every page you visit, including content loaded dynamically (infinite scroll, SPAs, live updates).
- **Fully customisable** — everything is managed from the settings page; changes save automatically and apply instantly. Settings sync across your Chrome profile.

## Install (Load unpacked)

1. Unzip this folder somewhere permanent (e.g. `Documents\signal-filter`) — Chrome loads it from disk, so don't delete it afterwards.
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `signal-filter` folder.
5. Pin the extension from the puzzle-piece menu if you want quick access to the toggle.

## Usage

- Click the toolbar icon for a quick on/off toggle and to open **Settings**.
- **Blocked sites** — enter bare domains like `dailymail.co.uk`. Subdomains are covered automatically (`www.`, `m.`, etc.).
- **Redirect destination** — full URL, e.g. `https://www.google.com` or anything else.
- **Word redaction** — add words or phrases (`BBC`, `Daily Mail`...). Matching is case-insensitive and whole-word, and longer phrases take priority over shorter ones. Choose *Black out* or *Remove entirely*.

Defaults ship with `bbc.co.uk`, `bbc.com`, `dailymail.co.uk`, and `thesun.co.uk` blocked — remove or add whatever you like.

## Technical notes

- Site blocking uses `chrome.declarativeNetRequest` dynamic rules — redirects happen at the network layer before the page loads, so there's no flash of blocked content and near-zero performance cost.
- Word redaction is a content script using a `TreeWalker` for the initial pass and a `MutationObserver` for dynamic content. It skips form fields, editable areas, `<code>`/`<pre>`, and scripts so it won't break pages you're typing into.
- The badge on the toolbar icon shows how many domains are currently blocked.

## Firefox?

Firefox supports Manifest V3 and `declarativeNetRequest` in recent versions, but requires `browser_specific_settings` in the manifest and loading via `about:debugging`. This build targets Chromium browsers; ask if you'd like a Firefox variant.
