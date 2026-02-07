"use client";

import { useEffect, useState } from "react";

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : "";
}

export default function DashboardPage() {
  const [tokenPreview, setTokenPreview] = useState("");

  useEffect(() => {
    const t = getCookie("id_token");
    setTokenPreview(t ? t.slice(0, 20) + "..." : "(missing)");
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Dashboard (Protected)</h1>
      <p>If you can see this, middleware allowed you through </p>
      <p style={{ fontSize: 12, opacity: 0.75 }}>id_token: {tokenPreview}</p>

      <form action="/api/auth/logout" method="post" style={{ marginTop: 16 }}>
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}