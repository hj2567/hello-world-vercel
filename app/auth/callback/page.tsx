"use client";

import { useEffect, useState } from "react";

export default function AuthPage() {
  const [loginUrl, setLoginUrl] = useState("");

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
    const proxyApiKey = process.env.NEXT_PUBLIC_CRACKD_APIKEY!;
    const redirectUri = `${window.location.origin}/auth/callback`; // REQUIRED

    const url = new URL("https://secure.crackd.ai/auth/google");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("apikey", proxyApiKey);

    setLoginUrl(url.toString());
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Sign in</h1>

      {loginUrl ? (
        <>
          <a
            href={loginUrl}
            style={{
              display: "inline-block",
              padding: "10px 14px",
              border: "1px solid black",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Sign in with Google
          </a>

          <p style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
            Generated URL: {loginUrl}
          </p>
        </>
      ) : (
        <p>Loading…</p>
      )}
    </main>
  );
}
