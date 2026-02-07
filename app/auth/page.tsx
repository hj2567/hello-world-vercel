"use client";

import { useEffect, useState } from "react";

function randomString(len = 32) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ("0" + (b % 256).toString(16)).slice(-2)).join("");
}

export default function AuthPage() {
  const [loginUrl, setLoginUrl] = useState("");

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
    const redirectUri = `${window.location.origin}/auth/callback`; // REQUIRED

    const state = randomString(16);
    const nonce = randomString(16);
    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("oauth_nonce", nonce);

    const url = new URL("https://secure.crackd.ai/google");

    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);

    url.searchParams.set("response_type", "id_token");
    url.searchParams.set("response_mode", "fragment");

    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);

    url.searchParams.set("prompt", "select_account");

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
            Redirect URI: <b>/auth/callback</b>
          </p>
        </>
      ) : (
        <p>Loading…</p>
      )}
    </main>
  );
}
