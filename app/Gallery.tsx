"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UserBits = {
  name: string;
  email: string;
  picture: string;
};

function pickName(u: any) {
  return (
    u?.user_metadata?.full_name ||
    u?.user_metadata?.name ||
    u?.user_metadata?.given_name ||
    u?.email?.split("@")?.[0] ||
    "friend"
  );
}

export default function Gallery({ rows }: { rows: any[] }) {
  const [loadingUser, setLoadingUser] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<UserBits>({
    name: "friend",
    email: "",
    picture: "",
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (data?.user) {
        setAuthed(true);
        setUser({
          name: pickName(data.user),
          email: data.user.email || "",
          picture: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || "",
        });
      } else {
        setAuthed(false);
        setUser({ name: "friend", email: "", picture: "" });
      }

      setLoadingUser(false);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.replace("/");
  };

  return (
    <main
      style={{
        padding: 40,
        background: "radial-gradient(circle at top, #1a1a1a, #000)",
        minHeight: "100vh",
        fontFamily:
          '"DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.02em",
            marginBottom: "0.75rem",
          }}
        >
          Captions & Images!
        </h1>

        <p style={{ color: "#aaa", fontSize: "1.05rem", marginBottom: "1.5rem" }}>
          Hover a card to reveal the caption
        </p>

        {loadingUser ? null : !authed ? (
          <a
            href="/auth"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              borderRadius: 999,
              background: "#fff",
              color: "#111",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            Log in with Google
          </a>
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
            }}
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  objectFit: "cover",
                }}
              />
            ) : null}

            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 800, lineHeight: 1.1 }}>
                Welcome, {user.name || "friend"}!
              </div>
              {user.email ? (
                <div style={{ fontSize: 12, opacity: 0.8 }}>{user.email}</div>
              ) : null}
            </div>

            <button
              onClick={logout}
              style={{
                marginLeft: 10,
                padding: "10px 14px",
                borderRadius: 999,
                background: "#fff",
                color: "#111",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 28,
        }}
      >
        {rows.map((row: any) => (
          <FlipCard
            key={row.id}
            imageUrl={row.images.url}
            caption={row.content}
          />
        ))}
      </div>
    </main>
  );
}

function FlipCard({ imageUrl, caption }: { imageUrl: string; caption: string }) {
  const [hovered, setHovered] = useState(false);
  const radius = 26;

  return (
    <div
      style={{ perspective: 1200 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={0}
    >
      <div
        style={{
          width: "100%",
          height: 320,
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s ease",
          transform: hovered ? "rotateY(180deg)" : "rotateY(0deg)",
          borderRadius: radius,
          boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <img
            src={imageUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg, #ffffff, #f2f2f2)",
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 26,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1.05rem", lineHeight: 1.5, fontWeight: 700 }}>
            {caption}
          </div>
        </div>
      </div>
    </div>
  );
}
