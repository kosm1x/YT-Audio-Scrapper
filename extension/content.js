(() => {
  const BTN_ID = "ytag-btn";
  let busy = false;

  function setLabel(text, state) {
    const b = document.getElementById(BTN_ID);
    if (!b) return;
    b.textContent = text;
    b.dataset.state = state || "";
  }

  async function onClick(e) {
    e.stopPropagation();
    if (busy) return;
    busy = true;
    setLabel("⏳ 0%", "busy");
    try {
      const res = await browser.runtime.sendMessage({ action: "download", url: location.href });
      if (res.type === "done") setLabel("✔ Saved", "ok");
      else setLabel("✖ Failed", "err");
    } catch (_) {
      setLabel("✖ Failed", "err");
    }
    busy = false;
    setTimeout(() => setLabel("♫ Audio", ""), 4000);
  }

  function inject() {
    if (!location.pathname.startsWith("/watch")) return;
    if (document.getElementById(BTN_ID)) return;
    const controls = document.querySelector(".ytp-right-controls");
    if (!controls) return;
    const b = document.createElement("button");
    b.id = BTN_ID;
    b.className = "ytp-button";
    b.title = "Download audio (Alt+Shift+A)";
    b.textContent = "♫ Audio";
    b.addEventListener("click", onClick);
    controls.prepend(b);
  }

  browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === "progress" && busy) setLabel(`⏳ ${Math.round(msg.percent)}%`, "busy");
  });

  // YouTube is a SPA: re-inject after in-page navigation and player rebuilds.
  document.addEventListener("yt-navigate-finish", inject);
  new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
  inject();
})();
