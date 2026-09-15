"use client";

import { useState, useEffect } from "react";
import { SiGithub } from "react-icons/si";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import T from "@/components/ui/T";
import styles from "./Login.module.css";

/* ?next= — 로그인 후 이동할 곳을 호출한 쪽(Footer 등)이 지정한다. 오픈 리다이렉트 방지로
   같은 출처의 절대 경로만 허용한다("/…", 단 "//evil.com" 같은 프로토콜 상대 URL 은 제외). */
function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function AdminLoginPage() {
  const { t, language } = useLanguage();
  const { setInfinite } = useLenis();

  useEffect(() => {
    setInfinite(false);
  }, [setInfinite]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_saved_email");
    if (saved) {
      setEmail(saved);
      setRememberEmail(true);
    }
  }, []);

  // OAuth 콜백 실패로 되돌아온 경우(?error=oauth&reason=…) — 상세 사유까지 표시
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth") {
      const reason = params.get("reason");
      setError(reason ? `${t("admin.login.loginFailed")} — ${reason}` : t("admin.login.loginFailed"));
    }
  }, [t]);

  // GitHub OAuth 로그인 — Supabase provider 로 리다이렉트, /auth/callback 에서 세션 교환
  const handleGithub = async () => {
    setError("");
    const supabase = createClient();
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next")) ?? "/admin";
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (oauthErr) setError(t("admin.login.loginFailed"));
  };

  const formatRemaining = (sec: number) => {
    if (sec >= 60) {
      const m = Math.ceil(sec / 60);
      return t("admin.login.lockedMinutes").replace("{{n}}", String(m));
    }
    return t("admin.login.lockedSeconds").replace("{{n}}", String(sec));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    if (rememberEmail) {
      localStorage.setItem("admin_saved_email", email);
    } else {
      localStorage.removeItem("admin_saved_email");
    }

    try {
      // /api/admin/auth — server-side 인증 + lockout 적용
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "locked" && typeof data.remainingSeconds === "number") {
          setError(formatRemaining(data.remainingSeconds));
        } else if (typeof data.attemptsLeft === "number") {
          setError(
            `${t("admin.login.invalidCredentials")} ${t("admin.login.attemptsLeft").replace("{{n}}", String(data.attemptsLeft))}`,
          );
        } else {
          setError(t("admin.login.loginFailed"));
        }
        return;
      }

      // 새 기기 — 이메일 승인 필요 (status 202)
      if (data.status === "device_pending") {
        setInfo(t("admin.login.devicePending"));
        return;
      }

      /* 클라 네비(router.push)로는 방금 설정된 세션 쿠키가 (dashboard)/layout 의 getUser()
         에 즉시 안 잡혀 새로고침이 필요했다. 풀 네비게이션으로 새 쿠키가 실린 서버 렌더에
         진입한다 — GitHub OAuth 의 /auth/callback 리다이렉트와 같은 방식.
         ?next= 가 있으면 그리로(Footer 로그인은 /admin), 없으면 기존대로 설정 화면. */
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      window.location.assign(next ?? "/admin/settings");
      return;
    } catch {
      setError(t("admin.login.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}><T k="admin.login.title" /></h1>

        <div className={styles.inputGroup}>
          <Input
            id="email"
            type="email"
            label={t("admin.login.email")}
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />

          <Input
            id="password"
            type="password"
            label={t("admin.login.password")}
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
          />
        </div>

        <div className={styles.bottomRow}>
          <Checkbox
            checked={rememberEmail}
            onChange={setRememberEmail}
            shape="square"
            label={t("admin.login.rememberEmail")}
          />
        </div>

        <Button type="submit" fullWidth disabled={loading} soundDisabled>
          {loading ? (
            <span className={styles.wave}>
              {t("admin.login.signingIn").split("").map((char, i) => (
                <span
                  key={i}
                  className={styles.waveChar}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </span>
          ) : (
            <T k="admin.login.signIn" />
          )}
        </Button>

        {/* GitHub OAuth — 초대받은 저자용(및 owner). Supabase provider 로 로그인. */}
        <div className={styles.oauthDivider}>
          <span>{language === "ko" ? "또는" : "or"}</span>
        </div>
        <Button type="button" variant="outline" fullWidth onClick={handleGithub} soundDisabled>
          <span className={styles.oauthBtnInner}>
            <SiGithub size={16} />
            {language === "ko" ? "GitHub 로 로그인" : "Sign in with GitHub"}
          </span>
        </Button>

        {/* 메시지 — 버튼 아래. 비어있어도 자리 차지해서 form 높이 안 흔들리게 */}
        <div className={styles.messageRow}>
          {error && <p className={styles.error}>{error}</p>}
          {!error && info && <p className={styles.info}>{info}</p>}
        </div>
      </form>
    </div>
  );
}
