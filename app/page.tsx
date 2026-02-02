import { supabase } from "../lib/supabaseClient";

export default async function Home() {
    const { data, error } = await supabase
        .from("captions")
        .select("id, content")
        .limit(40);

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
            <h1 style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>Hello World!</h1>
            <h1 style={{ fontSize: "2.5rem", marginBottom: "2rem" }}>Captions</h1>
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