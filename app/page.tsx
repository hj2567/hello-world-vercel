import { supabase } from "../lib/supabaseClient";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export default async function Home() {
  const { data, error } = await supabase
    .from("captions")
    .select("id, content, images(url)")
    .not("image_id", "is", null)
    .order("created_datetime_utc", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Error loading captions</h1>
        <pre>{error.message}</pre>
      </main>
    );
  }

  const rows = (data || []).filter((row: any) => row.images?.url);

  return (
    <main
      className={dmSans.className}
      style={{
        padding: 40,
        background: "radial-gradient(circle at top, #1a1a1a, #000)",
        minHeight: "100vh",
      }}
    >

      <div
        style={{
          textAlign: "center",
          marginBottom: "3.5rem",
        }}
      >
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.02em",
            marginBottom: "0.75rem",
          }}
        >
          Captions & Images
        </h1>

        <p
          style={{
            color: "#aaa",
            fontSize: "1.05rem",
            marginBottom: "1.75rem",
          }}
        >
          A tiny gallery of chaos, memes, and vibes
        </p>

        <a
          href="/auth"
          style={{
            display: "inline-block",
            padding: "12px 20px",
            borderRadius: 999,
            background: "#fff",
            color: "#111",
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          Log in with Google
        </a>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 28,
        }}
      >
        {rows.map((row: any) => (
          <div
            key={row.id}
            style={{
              background: "#ffffff",
              borderRadius: 26,
              boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                height: 220,
                padding: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f6f6f6",
              }}
            >
              <img
                src={row.images.url}
                alt=""
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: 14,
                }}
              />
            </div>

            <div
              style={{
                padding: "14px 16px 18px",
                fontSize: "0.95rem",
                lineHeight: 1.45,
                color: "#111",
              }}
            >
              {row.content}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
