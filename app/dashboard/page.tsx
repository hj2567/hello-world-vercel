"use client";

import { useEffect } from "react";

function pickFirst(obj: Record<string, string>, keys: string[]) {
  for (const k of keys) {
    const v = obj[k];
    if (v && v.trim().length > 0) return v;
  }
  return "";
}

export default function Dashboard() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const obj: Record<string, string> = {};
    params.forEach((v, k) => (obj[k] = v));

    const name =
      pickFirst(obj, ["name", "full_name", "display_name", "given_name"]) ||
      "friend";
    const email = pickFirst(obj, ["email", "user_email"]);
    const picture = pickFirst(obj, ["picture", "avatar", "photo"]);

    const user = { name, email, picture };

    localStorage.setItem("demo_user", JSON.stringify(user));
    localStorage.setItem("demo_authed", "true");

    window.location.replace("/");
  }, []);

  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>Signing you in…</h1>
      <p>Redirecting to the gallery.</p>
    </main>
  );
}
