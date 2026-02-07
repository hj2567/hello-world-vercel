"use client";

import { useEffect, useState } from "react";

type DemoUser = {
  name?: string;
  email?: string;
  picture?: string;
};

export default function Gallery({ rows }: { rows: any[] }) {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<DemoUser>({});

  useEffect(() => {
    const isAuthed = localStorage.getItem("demo_authed") === "true";
    setAuthed(isAuthed);

    const raw = localStorage.getItem("demo_user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("demo_authed");
    localStorage.removeItem("demo_user");
    setAuthed(false);
    setUser({});
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

        {!authed ? (
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
          <FlipCard key={row.id} imageUrl={row.images.url} caption={row.content} />
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
          height: 360,
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s ease",
          transform: hovered ? "rotateY(180deg)" : "rotateY(0deg)",
          borderRadius: radius,
          boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
          cursor: "pointer",
        }}
      >

        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            overflow: "hidden",
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
            borderRadius: radius,
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
