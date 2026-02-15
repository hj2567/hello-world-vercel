"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 520 }}>
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
