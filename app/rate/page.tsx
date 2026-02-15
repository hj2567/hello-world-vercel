"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  id: string;
  content: string;
  images?: { url?: string } | null;
};

type VoteValue = -1 | 1;

type UndoAction = {
  caption_id: string;
  prev_vote_value: VoteValue | null;
  index_before: number;
};

type UserInfo = {
  name: string;
  email: string;
  picture?: string;
};

type ThemeMode = "auto" | "day" | "night";

export default function RatePage() {
  const [loading, setLoading] = useState(true);

  const [restoring, setRestoring] = useState(true);

  const [sessionReady, setSessionReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "friend",
    email: "",
    picture: "",
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [i, setI] = useState(0);

  const [voteMap, setVoteMap] = useState<Record<string, VoteValue | null>>({});
  const [votesLoaded, setVotesLoaded] = useState(false);

  const [saving, setSaving] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [errMsg, setErrMsg] = useState<string>("");

  const [captionPinned, setCaptionPinned] = useState(false);


  const didRestoreRef = useRef(false);

  const restoreCompleteRef = useRef(false);


  const MIN_VOTE_GAP_MS = 350;
  const [lastVoteAt, setLastVoteAt] = useState<number>(0);
  const [slowMsg, setSlowMsg] = useState<string>("");
  const [showSlow, setShowSlow] = useState(false);


  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [systemPrefersDark, setSystemPrefersDark] = useState(true);

  const current = rows[i] || null;

  const effectiveTheme: "day" | "night" = useMemo(() => {
    if (themeMode === "day") return "day";
    if (themeMode === "night") return "night";
    return systemPrefersDark ? "night" : "day";
  }, [themeMode, systemPrefersDark]);

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


  const lastSeenKey = (uid: string) => `rate_last_seen_caption_id:${uid}`;

  const setLastSeen = (captionId: string) => {
    if (!userId) return;
    try {
      localStorage.setItem(lastSeenKey(userId), captionId);
    } catch {}
  };

  const getLastSeen = () => {
    if (!userId) return "";
    try {
      return localStorage.getItem(lastSeenKey(userId)) || "";
    } catch {
      return "";
    }
  };

  const isRated = (captionId: string, extraRated?: Set<string>) => {
    if (extraRated?.has(captionId)) return true;
    return voteMap[captionId] != null;
  };


  const computeNextUnratedIndex = (start: number, extraRated?: Set<string>) => {
    let idx = Math.max(0, start);
    while (idx < rows.length && isRated(rows[idx].id, extraRated)) idx++;
    return idx;
  };

  const jumpToIndex = (idx: number) => {
    setI(idx);
    setCaptionPinned(false);
    const nextId = rows[idx]?.id;
    if (restoreCompleteRef.current && nextId) setLastSeen(nextId);
  };


  useEffect(() => {
    if (!restoreCompleteRef.current) return;
    if (!current || !userId) return;
    setLastSeen(current.id);

  }, [current?.id, userId]);

  useEffect(() => {
    const saved = (localStorage.getItem("rate_theme") || "auto") as ThemeMode;
    if (saved === "auto" || saved === "day" || saved === "night") {
      setThemeMode(saved);
    }

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
    localStorage.setItem("rate_theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!showSlow) return;
    const tmr = window.setTimeout(() => setShowSlow(false), 1200);
    return () => window.clearTimeout(tmr);
  }, [showSlow, slowMsg]);

  const writeVote = async (captionId: string, v: VoteValue) => {
    if (!userId) throw new Error("Missing user");

    const ts = nowIso();

    const { data: updatedRows, error: updateErr } = await supabase
      .from("caption_votes")
      .update({
        vote_value: v,
        modified_datetime_utc: ts,
      })
      .eq("profile_id", userId)
      .eq("caption_id", captionId)
      .select("caption_id");

    if (updateErr) throw updateErr;

    if (!updatedRows || updatedRows.length === 0) {
      const { error: insertErr } = await supabase.from("caption_votes").insert({
        profile_id: userId,
        caption_id: captionId,
        vote_value: v,
        created_datetime_utc: ts,
        modified_datetime_utc: ts,
      });
      if (insertErr) throw insertErr;
    }
  };

  const deleteVote = async (captionId: string) => {
    if (!userId) throw new Error("Missing user");
    const { error } = await supabase
      .from("caption_votes")
      .delete()
      .eq("profile_id", userId)
      .eq("caption_id", captionId);
    if (error) throw error;
  };

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const user = session?.user;
      const uid = user?.id || null;

      if (!uid) {
        window.location.replace("/?needLogin=1");
        return;
      }

      setUserId(uid);

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
  }, []);

  useEffect(() => {
    if (!sessionReady) return;

    const load = async () => {
      setLoading(true);

      setRestoring(true);

      setErrMsg("");
      setVotesLoaded(false);

      didRestoreRef.current = false;
      restoreCompleteRef.current = false;

      const { data, error } = await supabase
        .from("captions")
        .select("id, content, images(url)")
        .not("image_id", "is", null)
        .order("created_datetime_utc", { ascending: false })
        .limit(250);

      if (error) {
        console.error(error);
        setErrMsg(error.message);
        setRows([]);
        setLoading(false);
        setRestoring(false);
        return;
      }

      const filtered = (data || []).filter((r: any) => r.images?.url) as Row[];
      setRows(filtered);
      setUndoStack([]);
      setCaptionPinned(false);
      setLoading(false);
    };

    load();
  }, [sessionReady]);

  useEffect(() => {
    const run = async () => {
      if (!userId) return;
      if (!rows.length) return;

      const captionIds = rows.map((r) => r.id);

      const { data, error } = await supabase
        .from("caption_votes")
        .select("caption_id, vote_value")
        .eq("profile_id", userId)
        .in("caption_id", captionIds);

      if (error) {
        console.error(error);
        setVotesLoaded(true);
        return;
      }

      const nextMap: Record<string, VoteValue | null> = {};
      for (const r of data || []) {
        const v = r.vote_value === 1 ? 1 : r.vote_value === -1 ? -1 : null;
        nextMap[r.caption_id] = v;
      }
      setVoteMap(nextMap);
      setVotesLoaded(true);
    };

    run();
  }, [userId, rows]);

  useEffect(() => {
    if (!userId) return;
    if (!rows.length) return;
    if (!votesLoaded) return;

    if (didRestoreRef.current) return;
    didRestoreRef.current = true;

    const lastId = getLastSeen();

    if (lastId) {
      const idx = rows.findIndex((r) => r.id === lastId);
      if (idx !== -1) {
        const start = voteMap[lastId] != null ? idx + 1 : idx;
        const nextIdx = computeNextUnratedIndex(start);

        setI(nextIdx);
        restoreCompleteRef.current = true;
        if (rows[nextIdx]?.id) setLastSeen(rows[nextIdx].id);

        setRestoring(false);
        return;
      }
    }

    const nextIdx = computeNextUnratedIndex(0);
    setI(nextIdx);
    restoreCompleteRef.current = true;
    if (rows[nextIdx]?.id) setLastSeen(rows[nextIdx].id);

    setRestoring(false);

  }, [rows, votesLoaded, userId, voteMap]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.replace("/");
  };

  const castVote = async (v: VoteValue) => {
    if (!current || !userId) return;
    if (saving) return;

    const now = Date.now();
    if (now - lastVoteAt < MIN_VOTE_GAP_MS) {
      setSlowMsg("Slow down 🙂");
      setShowSlow(true);
      return;
    }
    setLastVoteAt(now);

    setSaving(true);
    setErrMsg("");

    const captionId = current.id;
    const prevVote = voteMap[captionId] ?? null;
    const indexBefore = i;

    setUndoStack((s) => [
      ...s,
      {
        caption_id: captionId,
        prev_vote_value: prevVote,
        index_before: indexBefore,
      },
    ]);

    setVoteMap((m) => ({ ...m, [captionId]: v }));

    const nextIdx = computeNextUnratedIndex(i + 1, new Set([captionId]));
    jumpToIndex(nextIdx);

    try {
      await writeVote(captionId, v);
      setSaving(false);
    } catch (e: any) {
      console.error(e);
      setErrMsg(e?.message || "Unknown error");

      setI(indexBefore);
      setUndoStack((s) => s.slice(0, -1));
      setVoteMap((m) => {
        const copy = { ...m };
        if (prevVote == null) delete copy[captionId];
        else copy[captionId] = prevVote;
        return copy;
      });

      const backRow = rows[indexBefore];
      if (backRow?.id) setLastSeen(backRow.id);

      setSaving(false);
    }
  };

  const undo = async () => {
    if (!userId) return;
    if (saving) return;

    const last = undoStack[undoStack.length - 1];
    if (!last) return;

    setSaving(true);
    setErrMsg("");

    const { caption_id, prev_vote_value, index_before } = last;

    try {
      if (prev_vote_value == null) {
        await deleteVote(caption_id);
        setVoteMap((m) => {
          const copy = { ...m };
          delete copy[caption_id];
          return copy;
        });
      } else {
        await writeVote(caption_id, prev_vote_value);
        setVoteMap((m) => ({ ...m, [caption_id]: prev_vote_value }));
      }

      setUndoStack((s) => s.slice(0, -1));
      setI(index_before);
      setCaptionPinned(false);

      const backRow = rows[index_before];
      if (backRow?.id) setLastSeen(backRow.id);

      setSaving(false);
    } catch (e: any) {
      console.error(e);
      setErrMsg(e?.message || "Unknown error");
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const isTyping =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as any).isContentEditable);
      if (isTyping) return;

      if (e.code === "ArrowUp") {
        e.preventDefault();
        castVote(1);
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        castVote(-1);
      } else if (e.code === "KeyZ") {
        e.preventDefault();
        undo();
      } else if (e.code === "Space") {
        e.preventDefault();
        setCaptionPinned((vv) => !vv);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saving, current, userId, i, undoStack, voteMap, rows, lastVoteAt]);

  const unratedCount = useMemo(() => {
    let c = 0;
    for (const r of rows) if (voteMap[r.id] == null) c++;
    return c;
  }, [rows, voteMap]);

  const ratedCount = rows.length - unratedCount;

  const unratedPosition = useMemo(() => {
    if (!current) return 0;
    let before = 0;
    for (let k = 0; k < i; k++) if (voteMap[rows[k]?.id] == null) before++;
    return voteMap[current.id] == null ? before + 1 : before;
  }, [current, i, rows, voteMap]);

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
          "linear-gradient(to top, rgba(20,17,15,0.70), rgba(20,17,15,0.25), rgba(20,17,15,0.70))",
        spinnerBorder: "3px solid rgba(20,17,15,0.12)",
        spinnerTop: "#14110f",
      };
    }
    return {
      text: "#fff",
      muted: "#aaa",
      cardBg: "rgba(255,255,255,0.04)",
      cardBorder: "rgba(255,255,255,0.12)",
      shadow: "0 18px 55px rgba(0,0,0,0.45)",
      hintBg: "rgba(0,0,0,0.35)",
      hintBorder: "rgba(255,255,255,0.16)",
      hintText: "rgba(255,255,255,0.9)",
      btnBg: "#fff",
      btnText: "#111",
      ghostBg: "rgba(255,255,255,0.12)",
      ghostBorder: "rgba(255,255,255,0.18)",
      ghostText: "#fff",
      overlay:
        "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.30), rgba(0,0,0,0.78))",
      spinnerBorder: "3px solid rgba(255,255,255,0.2)",
      spinnerTop: "#fff",
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
    transition: "opacity 1000ms ease",
  };

  const dayTintStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 25% 0%, rgba(255, 214, 140, 0.22), rgba(255, 214, 140, 0.0) 62%)",
    opacity: effectiveTheme === "day" ? 1 : 0,
    transition: "opacity 1000ms ease",
    pointerEvents: "none",
    mixBlendMode: "multiply",
  };

  const contentStyle: CSSProperties = {
    position: "relative",
    zIndex: 1,
    padding: 24,
    transition: "color 1000ms ease",
  };

  if (loading || restoring) {
    return (
      <div style={bgWrapStyle}>
        <div style={nightLayerStyle} />
        <div style={dayLayerStyle} />
        <div style={dayTintStyle} />
        <div
          style={{
            ...contentStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
          }}
        >
          <SigningScreen subtitle="Preparing your rating session…" t={t} />
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div style={bgWrapStyle}>
        <div style={nightLayerStyle} />
        <div style={dayLayerStyle} />
        <div style={dayTintStyle} />
        <div
          style={{
            ...contentStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 520 }}>
            <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 10 }}>
              You’re done 🎉
            </h1>
            <p style={{ color: t.muted as any, fontSize: 16 }}>
              No more captions in this batch.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = current.images?.url || "";
  const undoDisabled = undoStack.length === 0;

  return (
    <div style={bgWrapStyle}>
      <div style={nightLayerStyle} />
      <div style={dayLayerStyle} />
      <div style={dayTintStyle} />

      <main style={contentStyle}>
        {/* Top bar */}
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
                  transition: "border-color 1000ms ease",
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
                  transition:
                    "background 1000ms ease, border-color 1000ms ease",
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
                Hi, {userInfo.name || "friend"}!
              </div>
              <div
                style={{
                  color: t.muted as any,
                  fontSize: 13,
                  transition: "color 1000ms ease",
                }}
              >
                {userInfo.email || ""}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                color: t.muted as any,
                fontSize: 13,
                fontWeight: 800,
                transition: "color 1000ms ease",
              }}
            >
              {ratedCount} / {rows.length}
            </div>

            <button
              onClick={logout}
              style={{
                marginTop: 8,
                padding: "10px 14px",
                borderRadius: 999,
                background: t.btnBg,
                color: t.btnText,
                fontWeight: 900,
                border: "none",
                cursor: "pointer",
                transition: "background 1000ms ease, color 1000ms ease",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div
          aria-live="polite"
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            pointerEvents: "none",
            opacity: showSlow ? 1 : 0,
            transition: "opacity 160ms ease",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              background:
                effectiveTheme === "day"
                  ? "rgba(20,17,15,0.75)"
                  : "rgba(0,0,0,0.55)",
              border:
                effectiveTheme === "day"
                  ? "1px solid rgba(255,255,255,0.24)"
                  : "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
              fontWeight: 900,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 16px 60px rgba(0,0,0,0.25)",
            }}
          >
            {slowMsg || "Slow down 🙂"}
          </div>
        </div>

        {errMsg ? (
          <div
            style={{
              maxWidth: 980,
              margin: "0 auto 14px",
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
              fontWeight: 800,
              transition:
                "background 1000ms ease, color 1000ms ease, border-color 1000ms ease",
            }}
          >
            Vote failed: {errMsg}
          </div>
        ) : null}

        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            borderRadius: 26,
            overflow: "hidden",
            boxShadow: t.shadow,
            border: `1px solid ${t.cardBorder}`,
            background: t.cardBg,
            transition:
              "background 1000ms ease, border-color 1000ms ease, box-shadow 1000ms ease",
          }}
        >
          <div
            style={imgWrap}
            className="imgWrap"
            onClick={() => setCaptionPinned((v) => !v)}
            title="Hover to preview, Space to toggle caption"
          >
            <img src={imageUrl} alt="" style={img} />
            <div
              className="captionOverlay"
              style={{ opacity: captionPinned ? 1 : undefined }}
            >
              <div style={captionText}>{current.content}</div>
            </div>

            <div
              style={{
                ...hintPill,
                background: t.hintBg,
                border: `1px solid ${t.hintBorder}`,
                color: t.hintText,
                transition:
                  "background 1000ms ease, color 1000ms ease, border-color 1000ms ease",
              }}
            >
              ↑ / ↓ vote • Z undo • Space caption
            </div>
          </div>

          <div style={controls}>
            <button
              onClick={() => castVote(1)}
              disabled={saving}
              style={{
                ...solidBtn,
                background: t.btnBg,
                color: t.btnText,
                opacity: saving ? 0.75 : 1,
                transition:
                  "background 1000ms ease, color 1000ms ease, opacity 120ms ease",
              }}
            >
              👍 Upvote
            </button>

            <button
              onClick={() => castVote(-1)}
              disabled={saving}
              style={{
                ...solidBtn,
                background: t.btnBg,
                color: t.btnText,
                opacity: saving ? 0.75 : 1,
                transition:
                  "background 1000ms ease, color 1000ms ease, opacity 120ms ease",
              }}
            >
              👎 Downvote
            </button>

            <button
              onClick={undo}
              disabled={undoDisabled}
              style={{
                ...ghostBtn,
                background: t.ghostBg,
                border: `1px solid ${t.ghostBorder}`,
                color: t.ghostText,
                filter: undoDisabled ? "grayscale(1)" : "none",
                opacity: undoDisabled ? 0.55 : 1,
                pointerEvents: undoDisabled ? "none" : "auto",
                transition:
                  "background 1000ms ease, color 1000ms ease, border-color 1000ms ease, opacity 120ms ease",
              }}
            >
              ↩️ Undo
            </button>
          </div>
        </div>

        <div
          style={{
            maxWidth: 980,
            margin: "18px auto 0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <ThemeToggle value={themeMode} onChange={setThemeMode} t={t} />
        </div>

        <style>{`
          .imgWrap .captionOverlay{
            position:absolute;
            inset:0;
            display:flex;
            align-items:center;
            justify-content:center;
            opacity:0;
            transition: opacity 160ms ease;
            background: ${t.overlay};
          }
          .imgWrap:hover .captionOverlay { opacity: 1; }
        `}</style>
      </main>
    </div>
  );
}

function ThemeToggle({
  value,
  onChange,
  t,
}: {
  value: ThemeMode;
  onChange: (v: ThemeMode) => void;
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
  };

  const btn = (active: boolean): CSSProperties => ({
    padding: "8px 10px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    background: active ? t.btnBg : "transparent",
    color: active ? t.btnText : t.ghostText,
    transition: "background 1000ms ease, color 1000ms ease",
  });

  return (
    <div style={pillStyle} aria-label="Theme">
      <button style={btn(value === "day")} onClick={() => onChange("day")}>
        Day
      </button>
      <button style={btn(value === "night")} onClick={() => onChange("night")}>
        Night
      </button>
      <button style={btn(value === "auto")} onClick={() => onChange("auto")}>
        Auto
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
          fontSize: "2.1rem",
          fontWeight: 900,
          marginBottom: 10,
          letterSpacing: "-0.02em",
        }}
      >
        Signing you in…
      </h1>
      <p style={{ color: t.muted as any, fontSize: "1.05rem", fontWeight: 700 }}>
        {subtitle}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const topBar: CSSProperties = {
  maxWidth: 980,
  margin: "0 auto 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const imgWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "16 / 9",
  background: "#0b0b0b",
  cursor: "pointer",
};

const img: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const captionText: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  fontSize: "1.2rem",
  lineHeight: 1.45,
  fontWeight: 800,
  textAlign: "center",
  padding: 22,
  color: "#fff",
  textShadow: "0 6px 18px rgba(0,0,0,0.55)",
};

const hintPill: CSSProperties = {
  position: "absolute",
  left: 16,
  bottom: 14,
  padding: "10px 12px",
  borderRadius: 999,
  fontWeight: 850,
  fontSize: 12,
  backdropFilter: "blur(10px)",
};

const controls: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: 16,
  flexWrap: "wrap",
};

const solidBtn: CSSProperties = {
  padding: "11px 14px",
  borderRadius: 999,
  fontWeight: 900,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
  minWidth: 150,
};

const ghostBtn: CSSProperties = {
  padding: "11px 14px",
  borderRadius: 999,
  fontWeight: 900,
  minWidth: 150,
};
