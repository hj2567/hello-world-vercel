"use client";

import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Sign in</h1>
      <button
        onClick={signInWithGoogle}
        style={{
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid #111",
          cursor: "pointer",
        }}
      >
        Sign in with Google
      </button>
    </main>
  );
}