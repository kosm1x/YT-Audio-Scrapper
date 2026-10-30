const $ = (id) => document.getElementById(id);

(async () => {
  const s = await browser.storage.local.get({ format: "mp3", quality: "0" });
  $("format").value = s.format;
  $("quality").value = s.quality;
  for (const k of ["format", "quality"])
    $(k).addEventListener("change", () => browser.storage.local.set({ [k]: $(k).value }));

  $("dl").addEventListener("click", async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!/^https:\/\/([\w-]+\.)?youtube\.com\/watch/.test(tab.url || "")) {
      $("status").textContent = "Open a YouTube video first.";
      return;
    }
    $("status").textContent = "Downloading…";
    const res = await browser.runtime.sendMessage({ action: "download", url: tab.url });
    $("status").textContent = res.type === "done" ? "Saved ✔" : (res.error || "Failed");
  });
})();
