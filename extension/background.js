const HOST = "yt_audio_host";
const DEFAULTS = { format: "mp3", quality: "0" };

async function getSettings() {
  return Object.assign({}, DEFAULTS, await browser.storage.local.get(DEFAULTS));
}

function notify(title, message) {
  browser.notifications.create({ type: "basic", title, message });
}

// Streams progress to the requesting tab; resolves with the final host message.
async function download(url, tabId) {
  const settings = await getSettings();
  return new Promise((resolve) => {
    let port;
    try {
      port = browser.runtime.connectNative(HOST);
    } catch (e) {
      return resolve({ type: "error", error: String(e) });
    }
    let settled = false;
    const finish = (msg) => { if (!settled) { settled = true; resolve(msg); } };
    port.onMessage.addListener((msg) => {
      if (msg.type === "progress") {
        if (tabId != null) browser.tabs.sendMessage(tabId, msg).catch(() => {});
      } else {
        finish(msg);
        port.disconnect();
      }
    });
    port.onDisconnect.addListener((p) => {
      const err = (p && p.error && p.error.message) || browser.runtime.lastError?.message;
      finish({ type: "error", error: err
        ? `Native host unavailable: ${err}. Run host/install.sh.`
        : "Native host closed unexpectedly." });
    });
    port.postMessage({ action: "download", url, format: settings.format, quality: settings.quality });
  });
}

browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.action === "download") {
    return download(msg.url, sender.tab && sender.tab.id).then((res) => {
      if (res.type === "done") notify("Audio saved", res.file || "Done");
      else notify("Download failed", res.error || "Unknown error");
      return res;
    });
  }
});

browser.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "download-audio") return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/([\w-]+\.)?youtube\.com\/watch/.test(tab.url || "")) return;
  const res = await download(tab.url, tab.id);
  if (res.type === "done") notify("Audio saved", res.file || "Done");
  else notify("Download failed", res.error || "Unknown error");
});
