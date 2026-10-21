"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import T from "@/components/ui/T";
import { errorText } from "@/lib/apiError";
import { safeNextPath } from "@/utils/safeNextPath";
import styles from "./Mfa.module.css";

interface Factor { id: string; name: string }
interface Enrollment { factorId: string; qrCode: string; secret: string }

/**
 * 2단계 인증 — 로그인 뒤 proxy 가 OTP 확인 전(aal1) 세션을 여기로 보낸다(lib/auth/mfa).
 * 인증 앱이 없으면 QR 로 등록하고, 있으면 코드만 받는다. 확인되면 세션이 aal2 로 올라 ?next= 로 간다.
 * ?add=1 — 설정 화면에서 인증 앱을 하나 더 붙일 때(이미 확인된 세션).
 */
export default function AdminMfaPage() {
  const { t } = useLanguage();
  const { setInfinite } = useLenis();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [factorId, setFactorId] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInfinite(false);
  }, [setInfinite]);

  const goNext = useCallback(() => {
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    // 풀 네비게이션 — 방금 바뀐 세션 쿠키(aal2)가 실린 서버 렌더로 들어간다
    window.location.assign(next ?? "/admin");
  }, []);

  useEffect(() => {
    const adding = new URLSearchParams(window.location.search).get("add") === "1";
    (async () => {
      try {
        const res = await fetch("/api/admin/auth/mfa");
        const data = await res.json();
        if (!res.ok) throw new Error();
        if (data.verified && !adding) return goNext();
        const list: Factor[] = data.factors ?? [];
        if (list.length && !adding) {
          setFactors(list);
          setFactorId(list[0].id);
          return;
        }
        const enroll = await fetch("/api/admin/auth/mfa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "enroll" }),
        });
        const e = await enroll.json();
        if (!enroll.ok) throw new Error();
        setFactors(list);
        setEnrollment(e);
        setFactorId(e.factorId);
      } catch {
        setError(t("admin.mfa.loadFailed"));
      }
    })();
  }, [goNext, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", factorId, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorText(data, t, t("admin.login.errorOccurred")));
        setCode("");
        return;
      }
      goNext();
    } catch {
      setError(t("admin.login.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" }).catch(() => {});
    window.location.assign("/admin/login");
  };

  const ready = factors !== null;

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}><T k="admin.mfa.title" /></h1>

        {ready && (
          <p className={styles.desc}>
            <T k={enrollment ? "admin.mfa.enrollDesc" : "admin.mfa.challengeDesc"} />
          </p>
        )}

        {enrollment && (
          <>
            {/* Supabase 가 돌려주는 SVG data URL — next/image 최적화 대상이 아니다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.qr} src={enrollment.qrCode} alt={t("admin.mfa.qrAlt")} />
            <div className={styles.secret}>
              <span><T k="admin.mfa.secretLabel" /></span>
              <code className={styles.secretValue}>{enrollment.secret}</code>
            </div>
          </>
        )}

        {ready && !enrollment && factors.length > 1 && (
          <Select
            value={factorId}
            options={factors.map((f) => ({ value: f.id, label: f.name || f.id.slice(0, 8) }))}
            onChange={setFactorId}
          />
        )}

        {ready && (
          <>
            <Input
              id="mfa-code"
              label={t("admin.mfa.code")}
              value={code}
              onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
            />
            <Button type="submit" fullWidth disabled={loading || code.length !== 6} soundDisabled>
              {loading ? t("admin.mfa.verifying") : t("admin.mfa.verify")}
            </Button>
          </>
        )}

        <div className={styles.messageRow}>
          {error && <p className={styles.error}>{error}</p>}
        </div>

        <Button type="button" variant="link" className={styles.signOut} onClick={handleSignOut} soundDisabled>
          <T k="admin.mfa.signOut" />
        </Button>
      </form>
    </div>
  );
}
