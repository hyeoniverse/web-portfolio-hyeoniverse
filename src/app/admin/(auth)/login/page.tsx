"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_saved_email");
    if (saved) {
      setEmail(saved);
      setRememberEmail(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (rememberEmail) {
      localStorage.setItem("admin_saved_email", email);
    } else {
      localStorage.removeItem("admin_saved_email");
    }

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        const key = data.code === "invalid_credentials"
          ? "admin.login.invalidCredentials"
          : "admin.login.loginFailed";
        setError(t(key));
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
        <h1 className={styles.title}>{t("admin.login.title")}</h1>

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

        <div className={styles.bottomRow}>
          <Checkbox
            checked={rememberEmail}
            onChange={setRememberEmail}
            shape="square"
            label={t("admin.login.rememberEmail")}
          />
          {error && <p className={styles.error}>{error}</p>}
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
            t("admin.login.signIn")
          )}
        </Button>
      </form>
    </div>
  );
}
