"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  useEffect(() => {
    const finish = async () => {
      await supabase.auth.getSession();

      sessionStorage.removeItem("oauth_started");

      window.location.replace("/");
    };
    finish();
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
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.2)",
            borderTopColor: "#fff",
            margin: "0 auto 28px",
            animation: "spin 1s linear infinite",
          }}
        />

        <h1
          style={{
            fontSize: "2.1rem",
            fontWeight: 800,
            marginBottom: 12,
            letterSpacing: "-0.02em",
          }}
        >
          Signing you in.
        </h1>

        <p style={{ color: "#aaa", fontSize: "1.05rem" }}>
          Almost there!
        </p>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </main>
  );
}
