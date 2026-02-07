"use client";

import { randomString, sha256, base64url } from "@/lib/pkce";

export default function AuthPage() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Auth Login</h1>
        <p style={{ color: "red" }}>
          Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID (set it in Vercel env vars + redeploy)
        </p>
      </main>
    );
  }

  async function signIn() {

    const verifier = randomString(64);
    const challenge = base64url(await sha256(verifier));
    const state = randomString(24);

    sessionStorage.setItem("pkce_verifier", verifier);
    sessionStorage.setItem("oauth_state", state);

    const redirectUri = `${window.location.origin}/auth/callback`;

    const params = new URLSearchParams(
      Object.entries({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
        prompt: "consent",
      }).map(([k, v]) => [k, String(v)])
    );

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  return (
    <main style={{ padding: 40, maxWidth: 520 }}>
      <h1>Auth Login</h1>
      <p>Sign in with Google to access the gated UI.</p>

      <button
        onClick={signIn}
        style={{
          padding: "10px 14px",
          cursor: "pointer",
          border: "1px solid #ccc",
          borderRadius: 8,
          background: "white",
        }}
      >
        Sign in with Google
      </button>
    </main>
  );
}
