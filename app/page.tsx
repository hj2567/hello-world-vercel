import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Home</h1>
      <Link href="/auth">Go to login</Link>
      <br />
      <Link href="/dashboard">Go to dashboard</Link>
    </main>
  );
}