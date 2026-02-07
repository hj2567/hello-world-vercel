"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  useEffect(() => {
    supabase.auth.getSession().then(() => {
      window.location.replace("/dashboard");
    });
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Signing you in…</h1>
      <p>Please wait.</p>
    </main>
  );
}