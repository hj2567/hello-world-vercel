import { supabase } from "../lib/supabaseClient";

export default async function Home() {
  const { data, error } = await supabase
    .from("captions")
    .select("id, content, images(url)")
    .order("created_datetime_utc", { ascending: false })
    .limit(60);

  if (error) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Error loading captions</h1>
        <pre>{error.message}</pre>
      </main>
    );
  }

  // Only captions that actually have images
  const rows = (data ?? []).filter((row: any) => row.images?.url);

  return (
    <main style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: "2.75rem", marginBottom: "2rem" }}>
        Hello World — Captions
      </h1>

      <div style={{ display: "grid", gap: 32 }}>
        {rows.map((row: any) => (
          <article
            key={row.id}
            style={{
              borderRadius: 20,
              overflow: "hidden",
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 16px 36px rgba(0,0,0,0.12)",
            }}
          >
            <div
              style={{
                width: "100%",
                background: "#f2f2f2",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <img
                src={row.images.url}
                alt=""
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "80vh", // prevents insanely tall images
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            <div style={{ padding: "18px 22px" }}>
              <div
                style={{
                  fontSize: "1.25rem",
                  lineHeight: 1.6,
                }}
              >
                {row.content}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}