import { redirect } from "next/navigation";

export default function AuthPage() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const redirectUri = `${base}/auth/callback`;

  const url =
    `https://secure.almostcrackd.ai/auth/google` +
    `?redirect_uri=${encodeURIComponent(redirectUri)}`;

  redirect(url);
}
