"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import posthog from "posthog-js";
import Variant1 from "./variants/variant-1";
import Variant2 from "./variants/variant-2";
import Variant3 from "./variants/variant-3";
import Variant4 from "./variants/variant-4";

const VARIANTS = [Variant1, Variant2, Variant3, Variant4];
const REPO_FULL_NAME = 'ibrahim-ansari-code/y';
const LAYER = 'layer-1';
const BEACON_URL = 'http://localhost:8000';
const POSTHOG_KEY = 'phc_kEMwL4YHKOlAYC4Eoic8d5uCfRYZjRF6ZCknqynmoUJ';
const POSTHOG_HOST = 'https://us.i.posthog.com';
const POOL_KEY = "landright_variant_pool";

function getPool(): number[] {
  if (typeof window === "undefined") return [1, 2, 3, 4];
  try {
    const raw = sessionStorage.getItem(POOL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as number[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [1, 2, 3, 4];
}

function pickAndUpdatePool(): number {
  const pool = getPool();
  const idx = Math.floor(Math.random() * pool.length);
  const picked = pool[idx];
  const next = pool.filter((_, i) => i !== idx);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(POOL_KEY, JSON.stringify(next.length > 0 ? next : [1, 2, 3, 4]));
    } catch {}
  }
  return picked;
}

function sendCtaClick(ctaLabel?: string, ctaId?: string) {
  const w = window as unknown as { __landrightVariantId?: number };
  fetch(BEACON_URL + "/beacon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "button_click",
      repo_full_name: REPO_FULL_NAME,
      layer: LAYER,
      variant_id: String(w.__landrightVariantId ?? ""),
      cta_label: ctaLabel ?? undefined,
      cta_id: ctaId ?? undefined,
    }),
  }).catch(() => {});
}

function sendTimeOnPage(durationSeconds: number, sectionId?: string) {
  const w = window as unknown as { __landrightVariantId?: number };
  const payload: Record<string, unknown> = {
    repo_full_name: REPO_FULL_NAME,
    layer: LAYER,
    variant_id: String(w.__landrightVariantId ?? ""),
    duration_seconds: durationSeconds,
  };
  if (sectionId) payload.section_id = sectionId;
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(BEACON_URL + "/beacon-time", new Blob([body], { type: "application/json" }));
  } else {
    fetch(BEACON_URL + "/beacon-time", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }
}

export default function ClientPage() {
  const [v, setV] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionStartTimesRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    setV(pickAndUpdatePool());
  }, []);
  useEffect(() => {
    if (v != null) (window as unknown as { __landrightVariantId?: number }).__landrightVariantId = v;
  }, [v]);
  useEffect(() => {
    if (v == null) return;
    const startTime = Date.now();
    let lastHeartbeatAt = startTime;
    const sendTime = () => {
      const durationSeconds = (Date.now() - startTime) / 1000;
      if (durationSeconds > 0) sendTimeOnPage(durationSeconds);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendTime();
    };
    const onPageHide = () => { sendTime(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    // Periodic heartbeat so Supabase gets time even when unload beacon is dropped (e.g. tab close)
    const HEARTBEAT_INTERVAL_MS = 30000;
    const heartbeatId = setInterval(() => {
      const now = Date.now();
      const durationSeconds = (now - lastHeartbeatAt) / 1000;
      lastHeartbeatAt = now;
      if (durationSeconds > 0) sendTimeOnPage(durationSeconds);
    }, HEARTBEAT_INTERVAL_MS);
    return () => {
      clearInterval(heartbeatId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [v]);
  useEffect(() => {
    if (v == null || typeof window === "undefined") return;
    const flushSectionTimes = () => {
      const w = window as unknown as { __landrightVariantId?: number };
      const variantId = String(w.__landrightVariantId ?? v);
      sectionStartTimesRef.current.forEach((start, sectionId) => {
        const durationSeconds = (Date.now() - start) / 1000;
        if (durationSeconds > 0) {
          sendTimeOnPage(durationSeconds, sectionId);
          if (POSTHOG_KEY && (posthog as unknown as { __loaded?: boolean }).__loaded) {
            posthog.capture("section_viewed", {
              section_id: sectionId,
              duration_seconds: durationSeconds,
              repo_full_name: REPO_FULL_NAME,
              layer: LAYER,
              variant_id: variantId,
            });
          }
        }
      });
      sectionStartTimesRef.current.clear();
    };
    let cleanup: (() => void) | null = null;
    const t = setTimeout(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const sections = wrapper.querySelectorAll("[data-landright-section]");
      const observers: IntersectionObserver[] = [];
      sections.forEach((el) => {
        const sectionId = (el as HTMLElement).getAttribute("data-landright-section");
        if (!sectionId) return;
        const obs = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const id = (entry.target as HTMLElement).getAttribute("data-landright-section");
              if (!id) continue;
              const ratio = entry.intersectionRatio ?? 0;
              if (entry.isIntersecting && ratio >= 0.5) {
                sectionStartTimesRef.current.set(id, Date.now());
              } else {
                const start = sectionStartTimesRef.current.get(id);
                if (start != null) {
                  sectionStartTimesRef.current.delete(id);
                  const durationSeconds = (Date.now() - start) / 1000;
                  if (durationSeconds > 0) {
                    sendTimeOnPage(durationSeconds, id);
                    if (POSTHOG_KEY && (posthog as unknown as { __loaded?: boolean }).__loaded) {
                      posthog.capture("section_viewed", {
                        section_id: id,
                        duration_seconds: durationSeconds,
                        repo_full_name: REPO_FULL_NAME,
                        layer: LAYER,
                        variant_id: String(v),
                      });
                    }
                  }
                }
              }
            }
          },
          { threshold: 0.5, rootMargin: "0px" }
        );
        obs.observe(el);
        observers.push(obs);
      });
      const onHide = () => { flushSectionTimes(); };
      document.addEventListener("visibilitychange", onHide);
      window.addEventListener("pagehide", onHide);
      cleanup = () => {
        observers.forEach((o) => o.disconnect());
        document.removeEventListener("visibilitychange", onHide);
        window.removeEventListener("pagehide", onHide);
        flushSectionTimes();
      };
    }, 150);
    return () => {
      clearTimeout(t);
      if (cleanup) cleanup();
    };
  }, [v]);
  useEffect(() => {
    if (typeof window === "undefined" || v == null) return;
    if (!POSTHOG_KEY) return;
    if (!(posthog as unknown as { __loaded?: boolean }).__loaded) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST || "https://us.i.posthog.com",
        capture_pageview: true,
        session_recording: { maskAllInputs: false },
      });
    }
    posthog.register({
      repo_full_name: REPO_FULL_NAME,
      layer: LAYER,
      variant_id: String(v),
    });
  }, [v]);
  const handleCtaClick = useCallback((e: React.MouseEvent) => {
    const t = (e.target as HTMLElement).closest("a, button");
    if (!t) return;
    const label = (t as HTMLElement).textContent?.trim();
    const id = (t as HTMLElement).id ?? (t as HTMLElement).getAttribute("data-cta-id") ?? undefined;
    sendCtaClick(label ?? undefined, id ?? undefined);
  }, []);
  if (v == null) return <div style={{ minHeight: "100vh" }} />;
  const VariantComponent = VARIANTS[v - 1];
  return (
    <div
      ref={wrapperRef}
      data-repo-full-name={REPO_FULL_NAME}
      data-layer={LAYER}
      data-variant-id={String(v)}
      onClick={handleCtaClick}
      role="presentation"
    >
      <VariantComponent />
    </div>
  );
}
