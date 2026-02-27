"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Spot = {
  top: string;
  left: string;
  w: number;
  r: number;
  periodMs: number;
};

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      setAuthed(!!data.session);
      setLoading(false);
    };
    run();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #1a1a1a, #000)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          '"DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        color: "#fff",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <BackgroundGallery />

      <div
        style={{
          position: "relative",
          zIndex: 3,
          textAlign: "center",
          maxWidth: 520,
        }}
      >
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 900,
            marginBottom: 12,
            letterSpacing: "-0.03em",
          }}
        >
          The Humor Study 2.0
        </h1>

        <p style={{ color: "#aaa", fontSize: "1.1rem", marginBottom: 28 }}>
          Log in to rate captions!
        </p>

        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading…</div>
        ) : authed ? (
          <a
            href="/rate"
            style={{
              display: "inline-block",
              padding: "12px 18px",
              borderRadius: 999,
              background: "#fff",
              color: "#111",
              fontWeight: 900,
              textDecoration: "none",
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            }}
          >
            Continue to Rating →
          </a>
        ) : (
          <a
            href="/auth?next=/rate"
            style={{
              display: "inline-block",
              padding: "12px 18px",
              borderRadius: 999,
              background: "#fff",
              color: "#111",
              fontWeight: 900,
              textDecoration: "none",
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            }}
          >
            Log in with Google
          </a>
        )}
      </div>
    </main>
  );
}

function BackgroundGallery() {
  const [pool, setPool] = useState<string[]>([]);
  const [spotUrls, setSpotUrls] = useState<string[]>([]);
  const [spotNext, setSpotNext] = useState<string[]>([]);
  const [spotFlip, setSpotFlip] = useState<boolean[]>([]);
  const poolRef = useRef<string[]>([]);
  const startedRef = useRef(false);

  // 4x6 grid, but you can change rows/cols if you want
  const spots: Spot[] = useMemo(() => {
    const rows = 4;
    const cols = 6;
    const padX = 10;
    const padY = 14;
    const out: Spot[] = [];
    let idx = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const left = padX + (c * (100 - 2 * padX)) / (cols - 1);
        const top = padY + (r * (100 - 2 * padY)) / (rows - 1);
        const w = 190;
        const rdeg = (idx % 2 === 0 ? -1 : 1) * (4 + (idx % 3));

        // Faster flicker: ~1.4s–2.5s per tile
        const periodMs = 1400 + (idx % 8) * 150;

        out.push({
          top: `${top}%`,
          left: `${left}%`,
          w,
          r: rdeg,
          periodMs,
        });

        idx++;
      }
    }

    return out;
  }, []);

  const isSupportedUrl = (u: string) => {
    const s = u.toLowerCase().split("?")[0].split("#")[0];
    // Browser support depends on platform, but we include heic/heif per your requirement.
    // If a given browser can't decode it, it'll still fail to render—nothing we can do client-side without conversion.
    return (
      s.endsWith(".jpg") ||
      s.endsWith(".jpeg") ||
      s.endsWith(".png") ||
      s.endsWith(".webp") ||
      s.endsWith(".gif") ||
      s.endsWith(".heic") ||
      s.endsWith(".heif")
    );
  };

  const pickRandom = (exclude?: string) => {
    const arr = poolRef.current;
    if (!arr.length) return "";
    if (arr.length === 1) return arr[0];

    let u = "";
    for (let k = 0; k < 20; k++) {
      u = arr[Math.floor(Math.random() * arr.length)];
      if (u && u !== exclude) return u;
    }
    return arr.find((x) => x !== exclude) || arr[0];
  };

  // Build the pool from `images.url` directly (NOT captions join)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      const { data, error } = await supabase
        .from("images")
        .select("url")
        .order("created_datetime_utc", { ascending: false })
        .limit(600);

      if (error) {
        console.log("background images query error:", error);
        return;
      }

      const urls =
        (data || [])
          .map((r: any) => r?.url)
          .filter((u: any) => typeof u === "string" && u.length > 0)
          .filter((u: string) => isSupportedUrl(u)) || [];

      const deduped = Array.from(new Set(urls));

      console.log("bg pool raw count:", urls.length);
      console.log("bg pool deduped count:", deduped.length);
      console.log("bg sample urls:", deduped.slice(0, 10));

      poolRef.current = deduped;
      setPool(deduped);

      // init
      const init = spots.map(() => pickRandom());
      const initNext = init.map((u) => pickRandom(u));
      setSpotUrls(init);
      setSpotNext(initNext);
      setSpotFlip(spots.map(() => false));
    };

    run();
  }, [spots]);

  // Preload helper so tiles don't go blank while swapping
  const preload = (url: string) =>
    new Promise<void>((resolve) => {
      if (!url) return resolve();
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });

  // Per-tile timers: preload next, then flip + swap.
  useEffect(() => {
    if (!pool.length || !spotUrls.length || !spotNext.length) return;

    const timers: number[] = [];

    spots.forEach((s, idx) => {
      const tick = async () => {
        const nextUrl = spotNext[idx] || pickRandom(spotUrls[idx]);

        // preload next before showing it
        await preload(nextUrl);

        // flip fade
        setSpotFlip((prev) => {
          const copy = [...prev];
          copy[idx] = !copy[idx];
          return copy;
        });

        // commit current -> next
        setSpotUrls((prev) => {
          const copy = [...prev];
          copy[idx] = nextUrl || prev[idx];
          return copy;
        });

        // queue new next
        setSpotNext((prev) => {
          const copy = [...prev];
          copy[idx] = pickRandom(nextUrl);
          return copy;
        });

        timers[idx] = window.setTimeout(tick, s.periodMs);
      };

      timers[idx] = window.setTimeout(tick, s.periodMs);
    });

    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length, spotUrls.length, spotNext.length, spots]);

  if (!pool.length) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        {spots.map((s, idx) => {
          const a = spotUrls[idx];
          const b = spotNext[idx];
          if (!a || !b) return null;

          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                top: s.top,
                left: s.left,
                width: s.w,
                aspectRatio: "16 / 10",
                borderRadius: 22,
                transform: `translate(-50%, -50%) rotate(${s.r}deg)`,
                filter: "blur(0.7px) saturate(1.05)",
                boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
                opacity: 0.24,
                overflow: "hidden",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {/* Current */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 22,
                  backgroundImage: `url(${a})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transition: "opacity 520ms ease",
                  opacity: spotFlip[idx] ? 0 : 1,
                }}
              />
              {/* Next */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 22,
                  backgroundImage: `url(${b})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transition: "opacity 520ms ease",
                  opacity: spotFlip[idx] ? 1 : 0,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0.10), rgba(0,0,0,0.70))",
        }}
      />

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}