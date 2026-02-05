import { supabase } from "../lib/supabaseClient";

export default async function Home() {
  const { data, error } = await supabase
    .from("captions")
    .select("id, content, images(url)")
    .not("image_id", "is", null)
    .order("created_datetime_utc", { ascending: false })

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
      style={{
        padding: 40,
        background: "#0b0b0b",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: "2.5rem",
          marginBottom: "2rem",
          color: "#fff",
        }}
      >
        Hello World! Captions & Images!
      </h1>

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
              borderRadius: 20,
              boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >

            <div
              style={{
                height: 220, // Images same height
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
                  objectFit: "contain", // Ensuring no crop
                  borderRadius: 12,
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