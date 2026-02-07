"use client";

import { useEffect, useState } from "react";

export default function AuthPage() {
  const [loginUrl, setLoginUrl] = useState("");

  useEffect(() => {
    const redirectUri = `${window.location.origin}/auth/callback`;

    const url =
      "https://secure.almostcrackd.ai/auth/google" +
      `?redirect_uri=${encodeURIComponent(redirectUri)}`;

    setLoginUrl(url);
  }, []);

  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>Sign in</h1>
      {loginUrl ? (
        <a
          href={loginUrl}
          style={{
            display: "inline-block",
            padding: "12px 16px",
            border: "1px solid black",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Sign in with Google
        </a>
      ) : (
        <p>Loading…</p>
      )}

      <p style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
        Redirect: <b>/auth/callback</b>
      </p>
    </main>
  );
}
