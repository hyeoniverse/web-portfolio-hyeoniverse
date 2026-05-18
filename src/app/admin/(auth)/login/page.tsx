"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import T from "@/components/ui/T";
import styles from "./Login.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { setInfinite } = useLenis();

  useEffect(() => {
    setInfinite(false);
    return () => setInfinite(true);
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

      router.push("/admin/settings");
      router.refresh();
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

        {/* 메시지 — 버튼 아래. 비어있어도 자리 차지해서 form 높이 안 흔들리게 */}
        <div className={styles.messageRow}>
          {error && <p className={styles.error}>{error}</p>}
          {!error && info && <p className={styles.info}>{info}</p>}
        </div>
      </form>
    </div>
  );
}
