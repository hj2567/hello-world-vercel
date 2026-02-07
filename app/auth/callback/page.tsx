"use client";

import { useEffect, useMemo, useState } from "react";

export default function AuthCallbackPage() {
  const [payload, setPayload] = useState<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const obj: Record<string, string> = {};
    params.forEach((v, k) => (obj[k] = v));
    setPayload(obj);

    // If the proxy returns something like a token, you can store it here:
    // localStorage.setItem("auth_payload", JSON.stringify(obj));
    //
    // Later you can redirect:
    // window.location.href = "/dashboard";
  }, []);

  const pretty = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>Auth callback</h1>
      <p>If you see values below, the redirect worked ✅</p>
      <pre
        style={{
          marginTop: 16,
          padding: 16,
          background: "#111",
          color: "#0f0",
          borderRadius: 12,
          overflowX: "auto",
        }}
      >
        {pretty}
      </pre>
      <p style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
        URL must be exactly <b>/auth/callback</b> (no extra routes).
      </p>
    </main>
  );
}
