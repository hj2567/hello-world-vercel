"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/rate";

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        sessionStorage.removeItem("oauth_started_at");
        const savedNext = sessionStorage.getItem("oauth_next") || next;
        window.location.replace(savedNext);
      }
    };
    window.addEventListener("pageshow", onPageShow);

    sessionStorage.setItem("oauth_next", next);

    const now = Date.now();
    const last = Number(sessionStorage.getItem("oauth_started_at") || "0");

    const COOLDOWN_MS = 250;

    if (last && now - last < COOLDOWN_MS) {
      sessionStorage.removeItem("oauth_started_at");
      window.location.replace(next);
      return () => window.removeEventListener("pageshow", onPageShow);
    }

    sessionStorage.setItem("oauth_started_at", String(now));

    const go = async () => {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    };

    go();

    return () => window.removeEventListener("pageshow", onPageShow);
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
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.2)",
            borderTopColor: "#fff",
            margin: "0 auto 26px",
            animation: "spin 0.9s linear infinite",
          }}
        />
        <h1
          style={{
            fontSize: "2.1rem",
            fontWeight: 900,
            marginBottom: 12,
            letterSpacing: "-0.02em",
          }}
        >
          Redirecting to Google…
        </h1>
        <p style={{ color: "#aaa", fontSize: "1.05rem" }}>
          One moment. Getting things ready.
        </p>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </main>
  );
}
