"use client";

import { useEffect } from "react";

export default function CalendlyInit() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = run;
    document.body.appendChild(script);
    const t = setInterval(run, 400);
    const mo =
      typeof MutationObserver !== "undefined" &&
      new MutationObserver(run);
    if (mo) mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      clearInterval(t);
      if (mo) mo.disconnect();
    };
  }, []);
  return null;
}

function run() {
  if (typeof (window as unknown as { Calendly?: unknown }).Calendly === "undefined") return;
  document.querySelectorAll(".calendly-inline-widget:not([data-calendly-done])").forEach((el) => {
    const url = el.getAttribute("data-url");
    if (!url) return;
    el.setAttribute("data-calendly-done", "1");
    try {
      (window as unknown as { Calendly: { initInlineWidget: (o: unknown) => void } }).Calendly.initInlineWidget({
        url,
        parentElement: el,
        prefill: {},
        utm: {},
        resize: true,
      });
    } catch {}
  });
}
