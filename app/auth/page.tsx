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

const clientIdStr = clientId;

  async function signIn() {
    const state = randomString(32);
    const codeVerifier = randomString(64);
    const challengeBuf = await sha256(codeVerifier);
    const codeChallenge = base64url(challengeBuf);

    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("code_verifier", codeVerifier);

    const redirectUri = `${window.location.origin}/auth/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      prompt: "select_account",
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  return (
    <main style={{ padding: 40, maxWidth: 520 }}>
      <h1>Auth Login</h1>
      <p>Sign in with Google to access the gated UI.</p>
      <button onClick={signIn} style={{ padding: "10px 14px", cursor: "pointer" }}>
        Sign in with Google
      </button>
    </main>
  );
}
