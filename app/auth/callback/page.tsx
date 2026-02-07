"use client";

import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Finishing sign-in...");

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const err = url.searchParams.get("error");

    if (err) {
      setMsg(`Sign-in error: ${err}`);
      return;
    }

    const savedState = sessionStorage.getItem("oauth_state");
    const codeVerifier = sessionStorage.getItem("code_verifier");

    if (!code || !state || !codeVerifier || !savedState) {
      setMsg("Missing code/state. Go back to /auth and try again.");
      return;
    }
    if (state !== savedState) {
      setMsg("State mismatch. Go back to /auth and try again.");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;

    (async () => {
      const r = await fetch("/api/auth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, codeVerifier, redirectUri }),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setMsg(`Login failed: ${j?.error ?? "unknown error"}`);
        return;
      }

      sessionStorage.removeItem("oauth_state");
      sessionStorage.removeItem("code_verifier");

      window.location.href = "/dashboard";
    })();
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>/auth/callback</h1>
      <p>{msg}</p>
    </main>
  );
}
