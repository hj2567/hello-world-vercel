import { supabase } from "../lib/supabaseClient";

export default async function Home() {
    const { data, error } = await supabase
        .from("captions")
        .select("id, content")
        .limit(20);

    if (error) {
        return (
            <main style = {{ padding:40 }}>
                <h1> Error loading captions</h1>
                <pre>{error.message}</pre>
            </main>
        );
    }

    return (
        <main style = {{ padding:40 }}>
            <h1>Captions</h1>
            <ul>
            {data?.map((row) => (
                <li key={row.id} style={{ marginBottom: 12 }}>
                    {row.content}
                </li>
            ))}
            </ul>
        </main>
    );
}