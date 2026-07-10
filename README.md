# 🔍 CrawlExt

**CrawlExt** is a lightweight browser extension for **Firefox** and **Chromium** that helps you discover and analyze **all URLs, APIs, and parameters** on any webpage.

Designed for **web developers**, **security researchers**, and **Bug Bounty hunters**.

**Author:** Simon

---

## ✨ Features

- 🚀 **Auto URL Discovery** – Collects all links from DOM, scripts, and resources
- 🔍 **Advanced Search** – Filter URLs by keyword in real-time
- 📊 **Smart Categorization** – Groups URLs into: All, Params, API, Files, Special
- 🎯 **Auto API Detection** – Identifies API endpoints using intelligent patterns
- 📋 **Quick Copy** – Copy single or bulk URLs
- 🌐 **Scope Restriction** – Shows only URLs relevant to the main domain
- 💜 **Purple-Dark Theme** – Clean dark theme with purple accents

---

## 🆕 What's New in V3

V3 is a full architectural rewrite, not just a UI update:

- 🟢 **Live Status Code Checking** – Every discovered URL is checked in the background and color-tagged by status (200, 301, 403, 404, 500, etc.)
- ⚙️ **Dedicated Background Engine** – Requests now run through a real background worker with a concurrency-limited request queue
- 🔁 **Rate-Limit Resilience** – Automatic retries (up to 8), backoff delay, and pause-after-burst logic to survive `429 Too Many Requests`
- 🧠 **Smart Caching** – 15-minute TTL cache to avoid re-checking the same URL repeatedly
- 📈 **~3x Larger Detection Engine** – More accurate scope, param, and API detection

> V2 is still available for anyone who prefers the lighter, no-status-check version.

---

## 🎯 Why CrawlExt?

In Bug Bounty and penetration testing, **Attack Surface Discovery** is critical. CrawlExt automates this:

> **Just click a button and see all the URLs and APIs on the page — now with live status codes.**

Perfect for:
- Finding hidden APIs
- Identifying input parameters
- Discovering sensitive files (`robots.txt`, `sitemap.xml`, `.env`)
- Finding entry points for XSS, SQLi, IDOR testing
- Quickly spotting which endpoints are actually alive (200/403) vs dead (404)

---

## 📦 Downloads

### V3 (recommended)

| Browser | File | Download |
|---------|------|----------|
| 🦊 **Firefox** | `.xpi` | [Download](https://github.com/fsimonsec/simon-crawlext/releases/download/v3.0.0/simon-crawlext-firefox.xpi) |
| 🌐 **Chrome / Edge / Brave** | `.crx` | [Download](https://github.com/fsimonsec/simon-crawlext/releases/download/v3.0.0/Simon-crawlext-chrome.crx) |

### V2 (legacy, lighter version)

| Browser | File | Download |
|---------|------|----------|
| 🦊 **Firefox** | `.xpi` | [Download](https://github.com/fsimonsec/simon-crawlext/releases/download/v2.0.0/simon-recon-firefox.xpi) |
| 🌐 **Chrome / Edge / Brave** | `.crx` | [Download](https://github.com/fsimonsec/simon-crawlext/releases/download/v2.0.0/Simon-Recon-chrome.crx) |

---

## 🚀 How to Install

**Firefox:**
1. Download the `.xpi` file from the table above
2. Drag and drop it into Firefox
3. Click **Add**

> **Note:** If Firefox shows a warning, go to `about:config` and set `xpinstall.signatures.required` to `false`.

**Chrome / Edge / Brave:**
1. Download the `.crx` file from the table above
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Drag and drop the `.crx` file

---

## 🚀 How to Use

1. Click the extension icon in the toolbar
2. Click **Recon** button
3. Page reloads and **CrawlExt** opens
4. Browse, search, and copy URLs — check live status codes in V3!

---

## ⚠️ Firefox Installation Notes

If you see the error **"This add-on could not be installed because it appears to be corrupt"** :

1. Open Firefox and go to `about:config`
2. Click **Accept the Risk and Continue**
3. Search for `xpinstall.signatures.required`
4. Double-click to set it to **false**
5. Try installing again

> **Note:** This is only required for unsigned add-ons. The official Mozilla-signed version will install without this step.

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

**⭐ Star this repo if you find it useful!**
