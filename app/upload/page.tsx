"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ThemeMode = "auto" | "day" | "night";
type NavMode = "upload" | "rate";

type UserInfo = {
  name: string;
  email: string;
  picture?: string;
};

type ApiCaption = string | { content?: string; caption?: string; text?: string };

type HistoryItem = {
  image_id: string;
  image_url: string;
  created_datetime_utc: string;
  captions: string[];
};

const THEME_KEY = "rate_theme";

const safeGetTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "auto";
  const v = (localStorage.getItem(THEME_KEY) || "auto") as ThemeMode;
  return v === "day" || v === "night" || v === "auto" ? v : "auto";
};

const safeGetPrefersDark = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
  } catch {
    return true;
  }
};

export default function UploadGeneratePage() {
  const router = useRouter();
  const pathname = usePathname();

  const [sessionReady, setSessionReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string>("");

  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "friend",
    email: "",
    picture: "",
  });

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => safeGetTheme());
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    safeGetPrefersDark()
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [file, setFile] = useState<File | null>(null);

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [errMsg, setErrMsg] = useState<string>("");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [lastResult, setLastResult] = useState<{
    imageId: string;
    imageUrl: string;
    captions: string[];
  } | null>(null);

  const didInitRef = useRef(false);

  const [navMode, setNavMode] = useState<NavMode>("upload");
  useEffect(() => {
    if ((pathname || "").startsWith("/rate")) setNavMode("rate");
    else setNavMode("upload");
  }, [pathname]);

  const onNavChange = (v: NavMode) => {
    setNavMode(v);
    router.push(v === "upload" ? "/upload" : "/rate");
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setSystemPrefersDark(mq.matches);
    apply();

    const handler = () => apply();
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  useEffect(() => {
    const syncFromStorage = () => setThemeMode(safeGetTheme());

    const onFocus = () => syncFromStorage();
    const onVis = () => {
      if (document.visibilityState === "visible") syncFromStorage();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const effectiveTheme: "day" | "night" = useMemo(() => {
    if (themeMode === "day") return "day";
    if (themeMode === "night") return "night";
    return systemPrefersDark ? "night" : "day";
  }, [themeMode, systemPrefersDark]);

  const t = useMemo(() => {
    if (effectiveTheme === "day") {
      return {
        text: "#14110f",
        muted: "rgba(20,17,15,0.58)",
        cardBg: "rgba(255,255,255,0.72)",
        cardBorder: "rgba(20,17,15,0.10)",
        shadow: "0 18px 55px rgba(20,17,15,0.10)",
        hintBg: "rgba(255,255,255,0.62)",
        hintBorder: "rgba(20,17,15,0.10)",
        hintText: "rgba(20,17,15,0.78)",
        btnBg: "#14110f",
        btnText: "#fff7e8",
        ghostBg: "rgba(20,17,15,0.06)",
        ghostBorder: "rgba(20,17,15,0.14)",
        ghostText: "#14110f",
        overlay:
          "linear-gradient(to top, rgba(20,17,15,0.70), rgba(20,17,15,0.18), rgba(20,17,15,0.70))",
        spinnerBorder: "3px solid rgba(20,17,15,0.12)",
        spinnerTop: "#14110f",
        pillBg: "rgba(255,255,255,0.78)",
        pillBorder: "rgba(20,17,15,0.12)",
        pillText: "rgba(20,17,15,0.82)",
      };
    }
    return {
      text: "#fff",
      muted: "rgba(255,255,255,0.62)",
      cardBg: "rgba(255,255,255,0.04)",
      cardBorder: "rgba(255,255,255,0.12)",
      shadow: "0 18px 55px rgba(0,0,0,0.45)",
      hintBg: "rgba(0,0,0,0.35)",
      hintBorder: "rgba(255,255,255,0.16)",
      hintText: "rgba(255,255,255,0.90)",
      btnBg: "#fff",
      btnText: "#111",
      ghostBg: "rgba(255,255,255,0.12)",
      ghostBorder: "rgba(255,255,255,0.18)",
      ghostText: "#fff",
      overlay:
        "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.26), rgba(0,0,0,0.78))",
      spinnerBorder: "3px solid rgba(255,255,255,0.2)",
      spinnerTop: "#fff",
      pillBg: "rgba(0,0,0,0.42)",
      pillBorder: "rgba(255,255,255,0.16)",
      pillText: "rgba(255,255,255,0.92)",
    };
  }, [effectiveTheme]);

  const bgWrapStyle: CSSProperties = {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    color: t.text,
    fontFamily:
      '"DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  };

  const nightLayerStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at top, #1a1a1a, #000)",
  };

  const dayLayerStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at top, #fff7e8 0%, #f7f2e6 48%, #f3efe7 100%)",
    opacity: effectiveTheme === "day" ? 1 : 0,
    transition: mounted ? "opacity 1000ms ease" : "none",
  };

  const dayTintStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 25% 0%, rgba(255, 214, 140, 0.22), rgba(255, 214, 140, 0.0) 62%)",
    opacity: effectiveTheme === "day" ? 1 : 0,
    transition: mounted ? "opacity 1000ms ease" : "none",
    pointerEvents: "none",
    mixBlendMode: "multiply",
  };

  const contentStyle: CSSProperties = {
    position: "relative",
    zIndex: 1,
    padding: 24,
    transition: mounted ? "color 1000ms ease" : "none",
  };

  const nowIso = () => new Date().toISOString();

  const pickFirst = (obj: any, keys: string[]) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === "string" && v.trim().length > 0) return v;
    }
    return "";
  };

  const getGoogleAvatar = (user: any) => {
    const meta = user?.user_metadata || {};
    const direct =
      pickFirst(meta, ["picture", "avatar_url", "photo"]) ||
      pickFirst(user, ["picture", "avatar_url"]);
    if (direct) return direct;

    const identities = user?.identities || meta?.identities;
    if (Array.isArray(identities) && identities.length > 0) {
      for (const ident of identities) {
        const data = ident?.identity_data || ident;
        const url =
          pickFirst(data, ["avatar_url", "picture"]) ||
          pickFirst(ident, ["avatar_url", "picture"]);
        if (url) return url;
      }
    }

    const providerData = meta?.provider_id_data || meta?.provider_data;
    const url = pickFirst(providerData, ["avatar_url", "picture"]);
    if (url) return url;

    return "";
  };

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const user = session?.user;
      const uid = user?.id || null;
      const token = session?.access_token || "";

      if (!uid || !token) {
        router.replace("/?needLogin=1");
        return;
      }

      setUserId(uid);
      setAccessToken(token);

      const meta = user?.user_metadata || {};
      const name =
        pickFirst(meta, ["full_name", "name", "display_name", "given_name"]) ||
        "friend";
      const email = user?.email || "";
      const picture = getGoogleAvatar(user);

      setUserInfo({ name, email, picture });
      setSessionReady(true);
    };

    run();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };


  const splitMaybeList = (s: string) => {
    const raw = (s || "").trim();
    if (!raw) return [];

    const hasNewlines = raw.includes("\n");
    const looksNumbered = /^\s*\d+[\.\)]\s+/m.test(raw);
    const looksBulleted = /^\s*[-•]\s+/m.test(raw);

    if (hasNewlines || looksNumbered || looksBulleted) {
      return raw
        .split(/\r?\n+/)
        .map((line) =>
          line
            .replace(/^\s*\d+[\.\)]\s+/, "") // "1. " or "1) "
            .replace(/^\s*[-•]\s+/, "") // "- " or "• "
            .trim()
        )
        .filter(Boolean);
    }

    // Sometimes models return "a; b; c" as a single string.
    if (raw.includes(";") && raw.split(";").length >= 3) {
      return raw
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean);
    }

    return [raw];
  };

  const normalizeCaptions = (arr: ApiCaption[]) => {
    const out: string[] = [];
    for (const it of arr || []) {
      if (typeof it === "string") {
        out.push(...splitMaybeList(it));
        continue;
      }
      const s = (it?.content || it?.caption || it?.text || "").toString();
      out.push(...splitMaybeList(s));
    }
    return out;
  };


  const uniqCaptions = (arr: string[], limit = 5) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of arr || []) {
      const s = (raw || "").trim();
      if (!s) continue;

      const key = s
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[“”]/g, '"')
        .replace(/[’]/g, "'")
        .replace(/[.!?]+$/g, ""); // drop trailing punctuation

      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);

      if (out.length >= limit) break;
    }
    return out;
  };

  const fmtLocal = (iso: string) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const loadHistory = async (uid: string) => {
    setHistoryLoading(true);
    setErrMsg("");

    const { data, error } = await supabase
      .from("captions")
      .select("content, image_id, created_datetime_utc, images(url)")
      .eq("profile_id", uid)
      .order("created_datetime_utc", { ascending: false })
      .limit(200);

    if (error) {
      setErrMsg(error.message);
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    const rows = (data || []) as any[];

    const map = new Map<string, HistoryItem & { _seen?: Set<string> }>();

    for (const r of rows) {
      const imageId = (r?.image_id || "").toString();
      const content = (r?.content || "").toString();
      const created = (r?.created_datetime_utc || "").toString();
      const url = (r?.images?.url || "").toString();

      if (!imageId || !content || !url) continue;

      if (!map.has(imageId)) {
        map.set(imageId, {
          image_id: imageId,
          image_url: url,
          created_datetime_utc: created,
          captions: [],
          _seen: new Set<string>(),
        });
      }

      const g = map.get(imageId)!;
      if (!g.created_datetime_utc) g.created_datetime_utc = created;

      // Use same normalization as uniqCaptions so history doesn't show duplicates either
      const key = content
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[“”]/g, '"')
        .replace(/[’]/g, "'")
        .replace(/[.!?]+$/g, "");

      if (g._seen?.has(key)) continue;
      g._seen?.add(key);

      g.captions.push(content);
    }

    const groups = Array.from(map.values())
      .map(({ _seen, ...rest }) => rest)
      .sort((a, b) => {
        const ta = new Date(a.created_datetime_utc || 0).getTime();
        const tb = new Date(b.created_datetime_utc || 0).getTime();
        return tb - ta;
      });

    setHistory(groups);
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (!sessionReady || !userId) return;
    loadHistory(userId);
  }, [sessionReady, userId]);

  const apiBase = "https://api.almostcrackd.ai";

  const apiPost = async <T,>(path: string, body: any): Promise<T> => {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    });

    const txt = await res.text();
    if (!res.ok) {
      throw new Error(txt || `Request failed (${res.status})`);
    }
    try {
      return JSON.parse(txt) as T;
    } catch {
      return txt as unknown as T;
    }
  };

  const uploadToPresigned = async (presignedUrl: string, f: File) => {
    const res = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": f.type || "application/octet-stream",
      },
      body: f,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Upload failed (${res.status})`);
    }
  };

  const runPipeline = async () => {
    if (!userId) return;
    if (!accessToken) return;
    if (!file) {
      setErrMsg("Pick an image first.");
      return;
    }

    setRunning(true);
    setStatus("");
    setErrMsg("");
    setLastResult(null);

    try {
      setStatus("Step 1/4: Generating upload URL…");
      const step1 = await apiPost<{ presignedUrl: string; cdnUrl: string }>(
        "/pipeline/generate-presigned-url",
        { contentType: file.type || "image/jpeg" }
      );

      if (!step1?.presignedUrl || !step1?.cdnUrl) {
        throw new Error("Bad response from Step 1.");
      }

      setStatus("Step 2/4: Uploading image…");
      await uploadToPresigned(step1.presignedUrl, file);

      setStatus("Step 3/4: Registering image…");
      const step3 = await apiPost<{ imageId: string }>(
        "/pipeline/upload-image-from-url",
        { imageUrl: step1.cdnUrl, isCommonUse: false }
      );

      if (!step3?.imageId) {
        throw new Error("Bad response from Step 3.");
      }

      setStatus("Step 4/4: Generating captions…");
      const step4 = await apiPost<any>("/pipeline/generate-captions", {
        imageId: step3.imageId,
      });

      const normalized = normalizeCaptions(
        Array.isArray(step4) ? (step4 as ApiCaption[]) : step4?.captions || []
      );

      const captions = uniqCaptions(normalized, 5);

      if (!captions.length) {
        throw new Error("No captions returned.");
      }

      setStatus("Saving captions to Supabase…");

      const ts = nowIso();

      // ✅ Avoid inserting duplicates that already exist for this image_id + profile_id
      const { data: existing, error: existErr } = await supabase
        .from("captions")
        .select("content")
        .eq("profile_id", userId)
        .eq("image_id", step3.imageId)
        .limit(200);

      if (existErr) throw existErr;

      const existingKeys = new Set(
        (existing || []).map((r: any) =>
          (r?.content || "")
            .toString()
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ")
            .replace(/[“”]/g, '"')
            .replace(/[’]/g, "'")
            .replace(/[.!?]+$/g, "")
        )
      );

      const inserts = captions
        .filter((c) => {
          const key = (c || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ")
            .replace(/[“”]/g, '"')
            .replace(/[’]/g, "'")
            .replace(/[.!?]+$/g, "");
          return key && !existingKeys.has(key);
        })
        .map((c) => ({
          profile_id: userId,
          image_id: step3.imageId,
          content: c,
          is_public: false,
          is_featured: false,
          created_datetime_utc: ts,
          modified_datetime_utc: ts,
        }));

      if (inserts.length === 0) {
        setLastResult({
          imageId: step3.imageId,
          imageUrl: step1.cdnUrl,
          captions, // still show what the model generated
        });
        setStatus("Done ✅ Saved captions.");
        await loadHistory(userId);
        return;
      }

      const { error: insErr } = await supabase.from("captions").insert(inserts);
      if (insErr) throw insErr;

      setLastResult({
        imageId: step3.imageId,
        imageUrl: step1.cdnUrl,
        captions,
      });

      setStatus("Done ✅ Saved captions.");

      await loadHistory(userId);
    } catch (e: any) {
      setErrMsg(e?.message || "Unknown error");
      setStatus("");
    } finally {
      setRunning(false);
    }
  };

  const historyCount = useMemo(() => history.length, [history]);
  const captionCount = useMemo(() => {
    let n = 0;
    for (const g of history) n += g.captions.length;
    return n;
  }, [history]);

  const onDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0] || null;
    if (f) setFile(f);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div style={bgWrapStyle}>
      <div style={nightLayerStyle} />
      <div style={dayLayerStyle} />
      <div style={dayTintStyle} />

      <main style={contentStyle}>
        <div style={topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {userInfo.picture ? (
              <img
                src={userInfo.picture}
                alt=""
                referrerPolicy="no-referrer"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  objectFit: "cover",
                  border: `1px solid ${t.cardBorder}`,
                  transition: mounted ? "border-color 1000ms ease" : "none",
                }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  background:
                    effectiveTheme === "day"
                      ? "rgba(20,17,15,0.06)"
                      : "rgba(255,255,255,0.10)",
                  border: `1px solid ${t.cardBorder}`,
                  transition: mounted
                    ? "background 1000ms ease, border-color 1000ms ease"
                    : "none",
                }}
              />
            )}

            <div>
              <div
                style={{
                  fontWeight: 950,
                  fontSize: 20,
                  letterSpacing: "-0.02em",
                }}
              >
                Upload → Generate Captions
              </div>
              <div
                style={{
                  color: t.muted as any,
                  fontSize: 13,
                  transition: mounted ? "color 1000ms ease" : "none",
                }}
              >
                {userInfo.name || "friend"} · {userInfo.email || ""}
              </div>
            </div>
          </div>

          {/* ✅ RIGHT SIDE: MATCH Rate sizing */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ModeToggle value={navMode} onChange={onNavChange} t={t} />

            <button
              onClick={logout}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: t.btnBg,
                color: t.btnText,
                fontWeight: 900,
                border: "none",
                cursor: "pointer",
                transition: mounted
                  ? "background 1000ms ease, color 1000ms ease"
                  : "none",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto 18px",
            borderRadius: 26,
            overflow: "hidden",
            boxShadow: t.shadow,
            border: `1px solid ${t.cardBorder}`,
            background: t.cardBg,
            transition: mounted
              ? "background 1000ms ease, border-color 1000ms ease, box-shadow 1000ms ease"
              : "none",
          }}
          onDragOver={onDragOver}
          onDrop={onDropFile}
        >
          <div
            style={{
              padding: 18,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 999,
                  background: t.ghostBg,
                  border: `1px solid ${t.ghostBorder}`,
                  color: t.ghostText,
                  fontWeight: 900,
                  cursor: "pointer",
                  transition: mounted
                    ? "background 1000ms ease, color 1000ms ease, border-color 1000ms ease"
                    : "none",
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                />
                Choose image
              </label>

              <div
                style={{
                  color: t.muted as any,
                  fontWeight: 850,
                  fontSize: 14,
                  transition: mounted ? "color 1000ms ease" : "none",
                }}
              >
                {file
                  ? file.name
                  : "Pick an image (or drag & drop), then run the 4-step pipeline."}
              </div>
            </div>

            <button
              onClick={runPipeline}
              disabled={running}
              style={{
                padding: "12px 16px",
                borderRadius: 999,
                background: t.btnBg,
                color: t.btnText,
                fontWeight: 950,
                border: "none",
                cursor: running ? "default" : "pointer",
                opacity: running ? 0.75 : 1,
                transition: mounted
                  ? "background 1000ms ease, color 1000ms ease, opacity 140ms ease"
                  : "opacity 140ms ease",
                minWidth: 160,
                boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
              }}
            >
              {running ? "Running…" : "Run pipeline"}
            </button>
          </div>

          {(status || errMsg) && (
            <div style={{ padding: "0 18px 18px" }}>
              {errMsg ? (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background:
                      effectiveTheme === "day"
                        ? "rgba(255,80,80,0.10)"
                        : "rgba(255,80,80,0.12)",
                    border:
                      effectiveTheme === "day"
                        ? "1px solid rgba(255,80,80,0.22)"
                        : "1px solid rgba(255,80,80,0.28)",
                    color: effectiveTheme === "day" ? "#7a1f1f" : "#ffd2d2",
                    fontWeight: 850,
                  }}
                >
                  {errMsg}
                </div>
              ) : (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: t.hintBg,
                    border: `1px solid ${t.hintBorder}`,
                    color: t.hintText,
                    fontWeight: 850,
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    transition: mounted
                      ? "background 1000ms ease, color 1000ms ease, border-color 1000ms ease"
                      : "none",
                  }}
                >
                  {status}
                </div>
              )}
            </div>
          )}

          {lastResult ? (
            <div style={{ padding: "0 18px 18px" }}>
              <div
                style={{
                  borderRadius: 18,
                  overflow: "hidden",
                  border: `1px solid ${t.cardBorder}`,
                  background:
                    effectiveTheme === "day"
                      ? "rgba(255,255,255,0.62)"
                      : "rgba(255,255,255,0.06)",
                  transition: mounted
                    ? "background 1000ms ease, border-color 1000ms ease"
                    : "none",
                }}
              >
                <div style={resultInner}>
                  <div style={resultImgWrap}>
                    <img src={lastResult.imageUrl} alt="" style={resultImg} />
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        bottom: 12,
                        padding: "8px 10px",
                        borderRadius: 999,
                        background: t.pillBg,
                        border: `1px solid ${t.pillBorder}`,
                        color: t.pillText,
                        fontWeight: 950,
                        fontSize: 12,
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                      }}
                    >
                      {lastResult.captions.length} captions
                    </div>
                  </div>

                  <div style={resultRight}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ fontWeight: 950, fontSize: 14 }}>
                        Just added
                      </div>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: 12,
                          color: t.muted as any,
                        }}
                      >
                        {fmtLocal(nowIso())}
                      </div>
                    </div>

                    <div style={captionList}>
                      {lastResult.captions.map((c, idx) => (
                        <div key={`${idx}-${c}`} style={captionChip}>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            padding: "4px 2px 12px",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 950,
              letterSpacing: "-0.02em",
            }}
          >
            Your history
          </div>
          <div
            style={{
              color: t.muted as any,
              fontWeight: 900,
              fontSize: 13,
              transition: mounted ? "color 1000ms ease" : "none",
              textAlign: "right",
            }}
          >
            {historyLoading
              ? "Loading…"
              : `${historyCount} images · ${captionCount} captions`}
          </div>
        </div>

        {historyLoading ? (
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "36px 0",
            }}
          >
            <SigningScreen subtitle="Loading your history…" t={t} />
          </div>
        ) : history.length === 0 ? (
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: 18,
              borderRadius: 22,
              border: `1px solid ${t.cardBorder}`,
              background: t.cardBg,
              boxShadow: t.shadow,
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 6 }}>
              No history yet
            </div>
            <div style={{ color: t.muted as any, fontWeight: 850 }}>
              Upload an image above to generate captions and they’ll show here.
            </div>
          </div>
        ) : (
          <div style={historyGrid}>
            {history.map((g) => (
              <div
                key={g.image_id}
                style={{
                  borderRadius: 22,
                  overflow: "hidden",
                  border: `1px solid ${t.cardBorder}`,
                  background: t.cardBg,
                  boxShadow: t.shadow,
                  height: "100%",
                  transition: mounted
                    ? "background 1000ms ease, border-color 1000ms ease, box-shadow 1000ms ease"
                    : "none",
                }}
              >
                <div style={historyCardInner}>
                  <div style={historyImgWrap}>
                    <img src={g.image_url} alt="" style={historyImg} />
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        bottom: 12,
                        padding: "8px 10px",
                        borderRadius: 999,
                        background: t.pillBg,
                        border: `1px solid ${t.pillBorder}`,
                        color: t.pillText,
                        fontWeight: 950,
                        fontSize: 12,
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                      }}
                    >
                      {g.captions.length} captions
                    </div>
                  </div>

                  <div style={historyRight}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ fontWeight: 950, fontSize: 14 }}>
                        Captions
                      </div>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: 12,
                          color: t.muted as any,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtLocal(g.created_datetime_utc)}
                      </div>
                    </div>

                    <div style={captionList}>
                      {g.captions.map((c, idx) => (
                        <div key={`${g.image_id}-${idx}`} style={captionChip}>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/** ✅ EXACT same sizing as Rate page */
function ModeToggle({
  value,
  onChange,
  t,
}: {
  value: NavMode;
  onChange: (v: NavMode) => void;
  t: any;
}) {
  const pillStyle: CSSProperties = {
    display: "inline-flex",
    borderRadius: 999,
    padding: 4,
    background: t.ghostBg,
    border: `1px solid ${t.ghostBorder}`,
    gap: 4,
    transition: "background 1000ms ease, border-color 1000ms ease",
    boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
  };

  const btn = (active: boolean): CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
    background: active ? t.btnBg : "transparent",
    color: active ? t.btnText : t.ghostText,
    transition: "background 1000ms ease, color 1000ms ease",
    minWidth: 70,
  });

  return (
    <div style={pillStyle} aria-label="Mode">
      <button style={btn(value === "upload")} onClick={() => onChange("upload")}>
        Upload
      </button>
      <button style={btn(value === "rate")} onClick={() => onChange("rate")}>
        Rate
      </button>
    </div>
  );
}

function SigningScreen({ subtitle, t }: { subtitle: string; t: any }) {
  return (
    <div style={{ textAlign: "center", maxWidth: 520, padding: 24 }}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: "50%",
          border: t.spinnerBorder,
          borderTopColor: t.spinnerTop,
          margin: "0 auto 22px",
          animation: "spin 0.9s linear infinite",
        }}
      />
      <h1
        style={{
          fontSize: "2.0rem",
          fontWeight: 950,
          marginBottom: 10,
          letterSpacing: "-0.02em",
        }}
      >
        Working…
      </h1>
      <p style={{ color: t.muted as any, fontSize: "1.05rem", fontWeight: 800 }}>
        {subtitle}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const topBar: CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const historyGrid: CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const historyCardInner: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.15fr 1fr",
  alignItems: "stretch",
  height: "100%",
};

const historyImgWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  height: 320,
  background: "#0b0b0b",
  overflow: "hidden",
};

const historyImg: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  objectPosition: "center",
  display: "block",
};

const historyRight: CSSProperties = {
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  height: 320,
  overflow: "hidden",
};

const captionList: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  overflow: "auto",
  paddingRight: 2,
};

const captionChip: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.62)",
  border: "1px solid rgba(20,17,15,0.10)",
  fontWeight: 950,
  lineHeight: 1.25,
  color: "#14110f",
};

const resultInner: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.15fr 1fr",
  alignItems: "stretch",
};

const resultImgWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  height: 320,
  background: "#0b0b0b",
  overflow: "hidden",
};

const resultImg: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  objectPosition: "center",
  display: "block",
};

const resultRight: CSSProperties = {
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  height: 320,
  overflow: "hidden",
};