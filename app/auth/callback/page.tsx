"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function parseHash(hash: string) {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = parseHash(window.location.hash);

    const idToken = params.get("id_token") || "";
    const returnedState = params.get("state") || "";
    const expectedState = sessionStorage.getItem("oauth_state") || "";

    if (!idToken || !returnedState || returnedState !== expectedState) {
      router.replace("/auth");
      return;
    }

    document.cookie = `id_token=${encodeURIComponent(idToken)}; Path=/; SameSite=Lax; Secure`;

    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("oauth_nonce");

    router.replace("/dashboard");
  }, [router]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Signing you in…</h1>
      <p>Callback route: /auth/callback</p>
    </main>
  );
}
