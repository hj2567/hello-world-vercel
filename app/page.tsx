import { supabase } from "../lib/supabaseClient";
import Gallery from "./Gallery";

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

  return <Gallery rows={rows} />;
}