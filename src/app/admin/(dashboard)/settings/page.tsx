"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLenis } from "@/providers/LenisProvider";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { useLanguage } from "@/providers/LanguageProvider";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import { profileDefaults } from "@/components/admin/ProfileSections";
import type { ProfileData } from "@/types/profile";
import { TAB_IDS, TAB_CONFIG_KEYS, type TabId, deepMerge, deepEqual, computeDelta, extractDefaults, detectConflicts, isDeltaFormat, getTabForConfigPath, getContentSubTabForKey, type ConfigConflict } from "./_data/settingsConstants";
import GeneralTab from "./_components/GeneralTab";
import ContentTab from "./_components/ContentTab";
import AppearanceTab from "./_components/AppearanceTab";
import ServicesTab from "./_components/ServicesTab";
import AccountTab from "./_components/AccountTab";
import T from "@/components/ui/T";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import { useModalStore } from "@/stores/modalStore";
import styles from "./Settings.module.css";

const PROFILE_SECTION_LABELS: Record<string, string> = {
  experiences: "Experience",
  skillGroups: "Skills",
  philosophy: "Philosophy",
  approachSteps: "Approach",
  certifications: "Certifications",
  awards: "Awards",
};

// ── Diff helpers ──
type DiffOp = { type: "context" | "removed" | "added"; text: string; id: number; oldLn?: number; newLn?: number };

function buildDiffOps(oldStr: string, newStr: string): DiffOp[] {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = m, j = n, id = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({ type: "context", text: oldLines[i - 1], id: id++ });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: "added", text: newLines[j - 1], id: id++ });
      j--;
    } else {
      ops.push({ type: "removed", text: oldLines[i - 1], id: id++ });
      i--;
    }
  }
  ops.reverse();
  let oldLn = 1, newLn = 1;
  for (const op of ops) {
    if (op.type === "context") { op.oldLn = oldLn++; op.newLn = newLn++; }
    else if (op.type === "removed") { op.oldLn = oldLn++; }
    else { op.newLn = newLn++; }
  }
  return ops;
}

// Group consecutive non-context ops into hunks
type Hunk = { id: number; removed: DiffOp[]; added: DiffOp[] };
type DiffBlock = { type: "context"; ops: DiffOp[] } | { type: "hunk"; hunk: Hunk };

function groupIntoBlocks(ops: DiffOp[]): { blocks: DiffBlock[]; hunks: Hunk[] } {
  const blocks: DiffBlock[] = [];
  const hunks: Hunk[] = [];
  let hunkId = 0;
  let i = 0;
  while (i < ops.length) {
    if (ops[i].type === "context") {
      const ctxOps: DiffOp[] = [];
      while (i < ops.length && ops[i].type === "context") {
        ctxOps.push(ops[i]);
        i++;
      }
      blocks.push({ type: "context", ops: ctxOps });
    } else {
      const hunk: Hunk = { id: hunkId++, removed: [], added: [] };
      while (i < ops.length && ops[i].type !== "context") {
        if (ops[i].type === "removed") hunk.removed.push(ops[i]);
        else hunk.added.push(ops[i]);
        i++;
      }
      hunks.push(hunk);
      blocks.push({ type: "hunk", hunk });
    }
  }
  return { blocks, hunks };
}

function DiffResolver({
  conflict,
  label,
  onResolve,
  onDismiss,
}: {
  conflict: ConfigConflict;
  label: string;
  onResolve: (mergedValue: unknown) => void;
  onDismiss: () => void;
}) {
  const dbStr = typeof conflict.dbValue === "object" ? JSON.stringify(conflict.dbValue, null, 2) : String(conflict.dbValue);
  const codeStr = typeof conflict.codeDefault === "object" ? JSON.stringify(conflict.codeDefault, null, 2) : String(conflict.codeDefault);
  const ops = useMemo(() => buildDiffOps(dbStr, codeStr), [dbStr, codeStr]);
  const { blocks, hunks } = useMemo(() => groupIntoBlocks(ops), [ops]);

  // "db" = keep removed lines, "code" = keep added lines
  const [decisions, setDecisions] = useState<Record<number, "db" | "code">>(() => {
    const init: Record<number, "db" | "code"> = {};
    for (const h of hunks) init[h.id] = "db";
    return init;
  });

  const toggle = (hunkId: number) => {
    setDecisions((prev) => ({
      ...prev,
      [hunkId]: prev[hunkId] === "db" ? "code" : "db",
    }));
  };

  const handleApply = () => {
    const lines: string[] = [];
    for (const block of blocks) {
      if (block.type === "context") {
        for (const op of block.ops) lines.push(op.text);
      } else {
        const choice = decisions[block.hunk.id];
        if (choice === "db") {
          for (const op of block.hunk.removed) lines.push(op.text);
        } else {
          for (const op of block.hunk.added) lines.push(op.text);
        }
      }
    }
    const merged = lines.join("\n");
    try {
      onResolve(JSON.parse(merged));
    } catch {
      onResolve(merged);
    }
  };

  return (
    <div className={styles.conflictDiffModal}>
      <div className={styles.conflictDiffHeader}>
        <span className={styles.conflictDiffTitle}>{label}</span>
        <div className={styles.conflictDiffBtns}>
          <Button
            variant="outline"
            shape="circle"
            size="xs"
            onClick={handleApply}
            title="적용"
            icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          <button type="button" className={styles.conflictCloseBtn} onClick={onDismiss} title="닫기">
            <span className={styles.conflictCloseIcon}>
              <span className={styles.conflictCloseLine} />
              <span className={styles.conflictCloseLine} />
            </span>
          </button>
        </div>
      </div>
      <div className={styles.conflictDiffPre}>
        {blocks.map((block) => {
          if (block.type === "context") {
            return block.ops.map((op) => (
              <div key={op.id} className={styles.diffLineContext}>
                <span className={styles.diffLineNum}>{op.oldLn}</span>
                <span className={styles.diffLineNum}>{op.newLn}</span>
                {"  " + op.text}
              </div>
            ));
          }
          const { hunk } = block;
          const choice = decisions[hunk.id];
          // Extract key name from first line (e.g. `"role": ...` → `role`)
          const firstLine = (hunk.removed[0]?.text || hunk.added[0]?.text || "").trim();
          const keyMatch = firstLine.match(/^"([^"]+)"/);
          const tooltipLabel = keyMatch ? keyMatch[1] : firstLine.replace(/["{},[\]]/g, "").slice(0, 30).trim() || `block ${hunk.id + 1}`;

          // resolved: show chosen lines as clean context
          if (choice === "code") {
            return (
              <div key={`hunk-${hunk.id}`} className={styles.diffHunk}>
                <div className={styles.diffHunkOverlay}>
                  <Tooltip content={`되돌리기: ${tooltipLabel}`} placement="right">
                    <button
                      type="button"
                      className={`${styles.diffHunkFloatBtn} ${styles.diffHunkFloatRevert}`}
                      onClick={() => toggle(hunk.id)}
                    >
                      ↺
                    </button>
                  </Tooltip>
                </div>
                {hunk.added.map((op) => (
                  <div key={op.id} className={styles.diffLineResolved}>
                    <span className={styles.diffLineNum}>{op.newLn}</span>
                    <span className={styles.diffLineNum} />
                    {"  " + op.text}
                  </div>
                ))}
              </div>
            );
          }

          // default (db): show diff
          return (
            <div key={`hunk-${hunk.id}`} className={styles.diffHunk}>
              <div className={styles.diffHunkOverlay}>
                <Tooltip content={`Code 적용: ${tooltipLabel}`} placement="right">
                  <button
                    type="button"
                    className={`${styles.diffHunkFloatBtn} ${styles.diffHunkFloatAccept}`}
                    onClick={() => toggle(hunk.id)}
                  >
                    +
                  </button>
                </Tooltip>
              </div>
              {hunk.removed.map((op) => (
                <div key={op.id} className={styles.diffLineRemoved}>
                  <span className={styles.diffLineNum}>{op.oldLn}</span>
                  <span className={styles.diffLineNum} />
                  {"− " + op.text}
                </div>
              ))}
              {hunk.added.map((op) => (
                <div key={op.id} className={styles.diffLineAdded}>
                  <span className={styles.diffLineNum} />
                  <span className={styles.diffLineNum}>{op.newLn}</span>
                  {"+ " + op.text}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((s) => (
        <div key={s} className={styles.section}>
          <Skeleton width={120} height={18} borderRadius="var(--radius-sm)" />
          <div className={styles.fields} style={{ marginTop: "var(--spacing-md)" }}>
            {[0, 1].map((f) => (
              <div key={f} className={styles.fieldRow}>
                <SkeletonLine width={80} height={12} />
                <Skeleton width="100%" height={36} borderRadius="var(--radius-md)" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { setInfinite, lenis, stop, start } = useLenis();
  const { openModal, closeModal } = useModalStore();
  const [config, setConfig] = useState<SiteConfigData>(
    structuredClone(siteConfig) as unknown as SiteConfigData
  );
  const [profileData, setProfileData] = useState<ProfileData>(
    structuredClone(profileDefaults)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const savedConfigRef = useRef<SiteConfigData>(structuredClone(siteConfig) as unknown as SiteConfigData);
  const savedProfileRef = useRef<ProfileData>(structuredClone(profileDefaults));
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === "undefined") return "general";
    const p = new URLSearchParams(window.location.search);
    const tab = p.get("tab");
    return tab && TAB_IDS.includes(tab as TabId) ? (tab as TabId) : "general";
  });
  const [contentSubTab, setContentSubTab] = useState<"home" | "profile" | "works" | "posts">(() => {
    if (typeof window === "undefined") return "home";
    const p = new URLSearchParams(window.location.search);
    const sub = p.get("sub");
    return sub && ["home", "profile", "works", "posts"].includes(sub)
      ? (sub as "home" | "profile" | "works" | "posts")
      : "home";
  });
  const [accountEmail, setAccountEmail] = useState("");
  const [accountNewEmail, setAccountNewEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountConfirm, setAccountConfirm] = useState("");
  const [accountCurrentPassword, setAccountCurrentPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailChangeSentAt, setEmailChangeSentAt] = useState<string | null>(null);

  // ── 통합 충돌 상태 ──
  const [allConflicts, setAllConflicts] = useState<ConfigConflict[]>([]);
  const [checkedConflicts, setCheckedConflicts] = useState<Set<string>>(new Set());
  const [conflictExpanded, setConflictExpanded] = useState(false);

  // 현재 탭/서브탭에 해당하는 충돌만 필터
  const tabConflicts = useMemo(() => {
    if (activeTab === "content") {
      return allConflicts.filter((c) => c.tab === "content" && c.subTab === contentSubTab);
    }
    return allConflicts.filter((c) => c.tab === activeTab);
  }, [allConflicts, activeTab, contentSubTab]);

  const handleAccountUpdate = useCallback(async () => {
    if (!accountCurrentPassword) return;
    setAccountSaving(true);
    setAccountMessage("");
    try {
      const body: { currentPassword: string; email?: string; password?: string } = {
        currentPassword: accountCurrentPassword,
      };
      if (accountNewEmail !== accountEmail && accountNewEmail.trim() !== "") body.email = accountNewEmail;
      if (accountPassword) body.password = accountPassword;
      if (!body.email && !body.password) {
        setAccountMessage(t("admin.settings.noChanges"));
        return;
      }
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.emailConfirmationSent) {
        setAccountMessage(t("admin.settings.emailConfirmationSent"));
        setPendingEmail(accountNewEmail);
        setEmailChangeSentAt(new Date().toISOString());
      } else {
        setAccountMessage(t("admin.settings.updateSuccess"));
      }
      setAccountNewEmail("");
      setAccountCurrentPassword("");
      setAccountPassword("");
      setAccountConfirm("");
      setShowPasswordConfirm(false);
      if (!data.emailConfirmationSent) {
        setTimeout(() => setAccountMessage(""), 3000);
      }
    } catch (err) {
      setAccountMessage(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setAccountSaving(false);
    }
  }, [accountCurrentPassword, accountNewEmail, accountEmail, accountPassword, t]);

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);
    return () => { clearTimeout(timer); setInfinite(true); };
  }, [setInfinite, lenis, stop, start]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/profile").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/account").then((r) => r.json()).catch(() => null),
    ]).then(([settingsRes, profileRes, accountRes]) => {
      const foundConflicts: ConfigConflict[] = [];

      // ── siteConfig 충돌 감지 ──
      if (settingsRes?.config && Object.keys(settingsRes.config).length > 0) {
        const defaults = structuredClone(siteConfig) as unknown as SiteConfigData;
        let dbDelta: Record<string, unknown>;

        if (isDeltaFormat(settingsRes.config)) {
          dbDelta = settingsRes.config.delta;
          const found = detectConflicts(
            settingsRes.config.delta,
            settingsRes.config.savedDefaults,
            defaults
          );
          for (const c of found) {
            const tab = getTabForConfigPath(c.path);
            foundConflicts.push({
              ...c, source: "siteConfig", tab,
              subTab: tab === "content" ? getContentSubTabForKey(c.path.split(".")[0]) : undefined,
            });
          }
        } else {
          dbDelta = settingsRes.config;
          const diff = computeDelta(settingsRes.config, defaults);
          if (Object.keys(diff).length > 0) {
            const found = detectConflicts(diff, diff, defaults);
            for (const c of found) {
              const tab = getTabForConfigPath(c.path);
              foundConflicts.push({
                ...c, source: "siteConfig", tab,
                subTab: tab === "content" ? getContentSubTabForKey(c.path.split(".")[0]) : undefined,
              });
            }
          }
        }

        setConfig((prev) => {
          const merged = deepMerge(prev, dbDelta);
          savedConfigRef.current = structuredClone(merged) as SiteConfigData;
          return merged;
        });
      }

      // ── profile 충돌 감지 ──
      if (profileRes?.config) {
        const raw = profileRes.config;
        const isNewFormat = raw.data && raw.savedDefaults;
        const c = (isNewFormat ? raw.data : raw) as Partial<ProfileData>;
        const loaded: ProfileData = {
          experiences: c.experiences ?? profileDefaults.experiences,
          skillGroups: c.skillGroups ?? profileDefaults.skillGroups,
          philosophy: c.philosophy ?? profileDefaults.philosophy,
          approachSteps: c.approachSteps ?? profileDefaults.approachSteps,
          certifications: c.certifications ?? profileDefaults.certifications,
          awards: c.awards ?? profileDefaults.awards,
        };
        setProfileData(loaded);
        savedProfileRef.current = structuredClone(loaded);

        if (isNewFormat) {
          const savedDefs = raw.savedDefaults as Partial<ProfileData>;
          for (const key of Object.keys(profileDefaults) as (keyof ProfileData)[]) {
            if (savedDefs[key] !== undefined &&
              !deepEqual(savedDefs[key], profileDefaults[key])) {
              foundConflicts.push({
                path: key,
                dbValue: c[key],
                codeDefault: profileDefaults[key],
                oldDefault: savedDefs[key],
                source: "profile",
                tab: "content",
                subTab: "profile",
              });
            }
          }
        } else {
          for (const key of Object.keys(profileDefaults) as (keyof ProfileData)[]) {
            if (c[key] !== undefined &&
              !deepEqual(c[key], profileDefaults[key])) {
              foundConflicts.push({
                path: key,
                dbValue: c[key],
                codeDefault: profileDefaults[key],
                oldDefault: c[key],
                source: "profile",
                tab: "content",
                subTab: "profile",
              });
            }
          }
        }
      }

      if (foundConflicts.length > 0) setAllConflicts(foundConflicts);

      if (accountRes?.email) {
        setAccountEmail(accountRes.email);
        setPendingEmail(accountRes.pendingEmail ?? null);
        setEmailChangeSentAt(accountRes.emailChangeSentAt ?? null);
      }
    }).finally(() => setLoading(false));
  }, []);

  const saveDelta = useCallback(async (fullConfig: SiteConfigData) => {
    const defaults = structuredClone(siteConfig) as unknown as SiteConfigData;
    const delta = computeDelta(fullConfig, defaults);
    const savedDefaults = extractDefaults(delta, defaults);
    return fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: { delta, savedDefaults } }),
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage("");
    try {
      const keys = TAB_CONFIG_KEYS[activeTab] ?? [];
      const merged = { ...savedConfigRef.current } as Record<string, unknown>;
      for (const key of keys) {
        merged[key] = config[key];
      }

      // ── 체크된 siteConfig 충돌을 머지 ──
      const checkedItems = allConflicts.filter((c) => checkedConflicts.has(`${c.source}:${c.path}`));
      const siteConfigConflicts = checkedItems.filter((c) => c.source === "siteConfig");
      const profileConflicts = checkedItems.filter((c) => c.source === "profile");

      if (siteConfigConflicts.length > 0) {
        const defaults = structuredClone(siteConfig) as unknown as Record<string, unknown>;
        for (const c of siteConfigConflicts) {
          const parts = c.path.split(".");
          if (parts.length === 1) {
            merged[parts[0]] = defaults[parts[0]];
          } else {
            const section = { ...(merged[parts[0]] as Record<string, unknown>) };
            const defSection = defaults[parts[0]] as Record<string, unknown>;
            if (section && defSection) {
              section[parts[1]] = defSection[parts[1]];
              merged[parts[0]] = section;
            }
          }
        }
      }

      const mergedConfig = merged as unknown as SiteConfigData;

      // ── 체크된 profile 충돌을 머지 ──
      let mergedProfile = profileData;
      if (profileConflicts.length > 0) {
        mergedProfile = { ...profileData };
        for (const c of profileConflicts) {
          (mergedProfile as unknown as Record<string, unknown>)[c.path] =
            structuredClone((profileDefaults as unknown as Record<string, unknown>)[c.path]);
        }
      }

      // profile: content 탭이거나, profile 충돌이 체크됐을 때 저장
      const shouldSaveProfile = activeTab === "content" || profileConflicts.length > 0;

      const promises: Promise<Response>[] = [saveDelta(mergedConfig)];
      if (shouldSaveProfile) {
        promises.push(
          fetch("/api/admin/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: mergedProfile,
              savedDefaults: profileDefaults,
            }),
          }),
        );
      }

      const results = await Promise.all(promises);
      for (const res of results) {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
      }

      savedConfigRef.current = structuredClone(mergedConfig);
      if (shouldSaveProfile) {
        savedProfileRef.current = structuredClone(mergedProfile);
        setProfileData(structuredClone(mergedProfile));
      }
      setConfig(structuredClone(mergedConfig));

      // 저장 완료 → savedDefaults 갱신됨 → 모든 충돌 해소
      setAllConflicts([]);
      setCheckedConflicts(new Set());

      setMessage(t("admin.settings.saveSuccess"));
      router.refresh();
      try {
        const bc = new BroadcastChannel("settings-updated");
        bc.postMessage({ type: "settings-updated", timestamp: Date.now() });
        bc.close();
      } catch {}
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMessage(`${t("admin.settings.saveError")}${msg ? ` (${msg})` : ""}`);
    } finally {
      setSaving(false);
    }
  }, [activeTab, config, profileData, allConflicts, checkedConflicts, t, router, saveDelta]);

  // 단일 충돌 resolve (머지 결과 적용)
  const resolveConflict = useCallback(async (c: ConfigConflict, mergedValue: unknown) => {
    if (c.source === "siteConfig") {
      const updated = { ...savedConfigRef.current } as Record<string, unknown>;
      const parts = c.path.split(".");
      if (parts.length === 1) {
        updated[parts[0]] = mergedValue;
      } else {
        const section = { ...(updated[parts[0]] as Record<string, unknown>) };
        section[parts[1]] = mergedValue;
        updated[parts[0]] = section;
      }
      const mergedConfig = updated as unknown as SiteConfigData;
      setConfig(structuredClone(mergedConfig));
      savedConfigRef.current = structuredClone(mergedConfig);
      await saveDelta(savedConfigRef.current);
    } else if (c.source === "profile") {
      setProfileData((prev) => {
        const next = { ...prev };
        (next as Record<string, unknown>)[c.path] = structuredClone(mergedValue);
        return next;
      });
    }
    setAllConflicts((prev) => prev.filter((x) => !(x.source === c.source && x.path === c.path)));
    closeModal();
    router.refresh();
  }, [saveDelta, closeModal, router]);

  const openDiffModal = useCallback((c: ConfigConflict) => {
    const label = c.source === "profile" ? (PROFILE_SECTION_LABELS[c.path] ?? c.path) : c.path;

    openModal(
      <DiffResolver
        conflict={c}
        label={label}
        onResolve={(merged) => resolveConflict(c, merged)}
        onDismiss={() => closeModal()}
      />,
      {
        width: "min(90vw, 700px)",
        closeButton: false,
      },
    );
  }, [openModal, resolveConflict, closeModal]);

  const getConflictKey = (c: ConfigConflict) => `${c.source}:${c.path}`;
  const getConflictLabel = (c: ConfigConflict) =>
    c.source === "profile" ? (PROFILE_SECTION_LABELS[c.path] ?? c.path) : c.path;

  const update = <S extends keyof SiteConfigData>(
    section: S,
    key: keyof SiteConfigData[S],
    value: SiteConfigData[S][keyof SiteConfigData[S]]
  ) => {
    setConfig((prev) => {
      const sectionData = prev[section];
      if (typeof sectionData === "object" && sectionData !== null) {
        return { ...prev, [section]: { ...sectionData, [key]: value } };
      }
      return prev;
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <SkeletonLine width={120} height={32} />
          <SkeletonLine width={80} height={36} />
        </div>
        <div className={styles.layout}>
          <div className={`${styles.sideNav} ${styles.skeletonNav}`}>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonLine key={i} width={120} height={36} />
            ))}
          </div>
          <div className={styles.panel}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={styles.skeletonSection}>
                <SkeletonLine width={140} height={16} />
                <div className={styles.skeletonFields}>
                  <SkeletonLine width="100%" height={36} />
                  <SkeletonLine width="100%" height={36} />
                  <SkeletonLine width="100%" height={36} />
                  <SkeletonLine width="60%" height={36} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}><T k="admin.settings.title" /></h1>
        <div className={styles.headerRight}>
          {activeTab === "account" ? (
            <>
              {accountMessage && (
                <span className={`${styles.message} ${accountMessage.startsWith("Error") ? styles.messageError : styles.messageSuccess}`}>
                  {accountMessage}
                </span>
              )}
              <button
                className={styles.saveBtn}
                disabled={accountSaving}
                onClick={() => {
                  if (accountPassword && accountPassword !== accountConfirm) {
                    setAccountMessage(t("admin.settings.passwordMismatch"));
                    return;
                  }
                  const hasEmailChange = accountNewEmail !== accountEmail && accountNewEmail.trim() !== "";
                  const hasPasswordChange = !!accountPassword;
                  if (!hasEmailChange && !hasPasswordChange) {
                    setAccountMessage(t("admin.settings.noChanges"));
                    return;
                  }
                  setAccountMessage("");
                  setShowPasswordConfirm(true);
                }}
              >
                {accountSaving ? <T k="admin.settings.saving" /> : <T k="admin.settings.updateAccount" />}
              </button>
            </>
          ) : (
            <>
              {message && (
                <span
                  className={`${styles.message} ${message === t("admin.settings.saveError") ? styles.messageError : styles.messageSuccess}`}
                >
                  {message}
                </span>
              )}
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => setConfig(structuredClone(siteConfig) as unknown as SiteConfigData)}
              >
                <T k="admin.settings.reset" />
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <T k="admin.settings.saving" /> : <T k="admin.settings.save" />}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Side Nav ── */}
        <nav className={styles.sideNav}>
          {TAB_IDS.map((id) => {
            const tabCount = allConflicts.filter((c) => c.tab === id).length;
            return (
              <div key={id}>
                <button
                  type="button"
                  className={`${styles.navItem} ${activeTab === id ? styles.navItemActive : ""}`}
                  onClick={() => {
                    setActiveTab(id);
                    if (id === "content") setContentSubTab("home");
                    setConfig(structuredClone(savedConfigRef.current));
                    setProfileData(structuredClone(savedProfileRef.current));
                    setConflictExpanded(false);
                    setCheckedConflicts(new Set());
                  }}
                >
                  {t(`admin.settings.tabs.${id}`)}
                  {tabCount > 0 && <span className={styles.navConflictBadge} />}
                </button>
                {id === "content" && (
                  <div className={styles.navSub}>
                    {(["home", "profile", "works", "posts"] as const).map((sub) => {
                      const subCount = allConflicts.filter((c) => c.tab === "content" && c.subTab === sub).length;
                      return (
                        <button
                          key={sub}
                          type="button"
                          className={`${styles.navSubItem} ${activeTab === "content" && contentSubTab === sub ? styles.navSubItemActive : ""}`}
                          onClick={() => {
                            setActiveTab("content");
                            setContentSubTab(sub);
                            setConfig(structuredClone(savedConfigRef.current));
                            setProfileData(structuredClone(savedProfileRef.current));
                            setConflictExpanded(false);
                            setCheckedConflicts(new Set());
                          }}
                        >
                          {t(`admin.settings.contentSub.${sub}`)}
                          {subCount > 0 && <span className={styles.navConflictBadge} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Panel ── */}
        <div className={styles.panel}>
          {/* ── 통합 충돌 배너 (탭별 필터) ── */}
          {tabConflicts.length > 0 && (() => {
            const PREVIEW_COUNT = 3;
            const _previewItems = tabConflicts.slice(0, PREVIEW_COUNT);
            const allChecked = checkedConflicts.size === tabConflicts.length;
            const someChecked = checkedConflicts.size > 0 && !allChecked;

            return (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <T k="admin.settings.conflictTitle" /> ({tabConflicts.length})
                </h2>
                <p className={styles.conflictDesc}><T k="admin.settings.conflictDesc" /></p>

                <div
                  className={`${styles.conflictListClip} ${conflictExpanded ? styles.conflictListExpanded : ""}`}
                  ref={(el) => {
                    if (!el) return;
                    const selectAll = el.querySelector(`.${styles.conflictSelectAll}`) as HTMLElement | null;
                    const items = el.querySelectorAll(`.${styles.conflictPreviewItem}`);
                    const list = el.querySelector(`.${styles.conflictList}`) as HTMLElement | null;
                    if (!list) return;
                    // preview 높이: 전체선택 + 처음 PREVIEW_COUNT개 항목
                    let previewH = selectAll ? selectAll.offsetHeight : 0;
                    items.forEach((item, i) => {
                      if (i < PREVIEW_COUNT) previewH += (item as HTMLElement).offsetHeight;
                    });
                    el.style.setProperty("--_clip-h", `${previewH}px`);
                    el.style.setProperty("--_list-height", `${(selectAll?.offsetHeight ?? 0) + list.scrollHeight}px`);
                  }}
                >
                  <div className={styles.conflictSelectAll}>
                    <Checkbox
                      shape="square"
                      checked={allChecked}
                      indeterminate={someChecked}
                      onChange={(checked) => {
                        setCheckedConflicts(
                          checked ? new Set(tabConflicts.map(getConflictKey)) : new Set()
                        );
                      }}
                    />
                    <span className={styles.conflictSelectAllLabel}><T k="admin.settings.conflictSelectAll" /></span>
                  </div>
                  <div className={styles.conflictList}>
                    {tabConflicts.map((c) => {
                      const key = getConflictKey(c);
                      const label = getConflictLabel(c);
                      const dbStr = typeof c.dbValue === "object" ? JSON.stringify(c.dbValue, null, 2) : String(c.dbValue);
                      const codeStr = typeof c.codeDefault === "object" ? JSON.stringify(c.codeDefault, null, 2) : String(c.codeDefault);
                      return (
                        <div key={key} className={styles.conflictPreviewItem} onClick={() => openDiffModal(c)}>
                          <span style={{ display: "flex" }} onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              shape="square"
                              checked={checkedConflicts.has(key)}
                              onChange={(checked) => {
                                setCheckedConflicts((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(key); else next.delete(key);
                                  return next;
                                });
                              }}
                            />
                          </span>
                          <code className={styles.conflictPath}>{label}</code>
                          <div className={styles.conflictValues}>
                            <span className={styles.conflictValueDB} title={dbStr}>{dbStr}</span>
                            <span className={styles.conflictValueCode} title={codeStr}>{codeStr}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className={styles.conflictFooter}>
                  {!conflictExpanded && tabConflicts.length > PREVIEW_COUNT ? (
                    <button
                      type="button"
                      className={styles.conflictToggle}
                      onClick={() => setConflictExpanded(true)}
                    >
                      + {tabConflicts.length - PREVIEW_COUNT}건 더 보기
                    </button>
                  ) : conflictExpanded ? (
                    <button
                      type="button"
                      className={styles.conflictToggle}
                      onClick={() => setConflictExpanded(false)}
                    >
                      <T k="admin.settings.conflictCollapse" />
                    </button>
                  ) : null}
                </div>
              </section>
            );
          })()}

          {loading ? (
            <SettingsSkeleton />
          ) : (
            <>
              {activeTab === "general" && (
                <GeneralTab config={config} update={update} styles={styles} />
              )}
              {activeTab === "content" && (
                <>
                  <div className={styles.mobileSubNav}>
                    {(["home", "profile", "works", "posts"] as const).map((sub) => {
                      const subCount = allConflicts.filter((c) => c.tab === "content" && c.subTab === sub).length;
                      return (
                        <button
                          key={sub}
                          type="button"
                          className={`${styles.mobileSubItem} ${contentSubTab === sub ? styles.mobileSubItemActive : ""}`}
                          onClick={() => {
                            setContentSubTab(sub);
                            setConflictExpanded(false);
                            setCheckedConflicts(new Set());
                          }}
                        >
                          {t(`admin.settings.contentSub.${sub}`)}
                          {subCount > 0 && <span className={styles.navConflictBadge} />}
                        </button>
                      );
                    })}
                  </div>
                <ContentTab
                  config={config}
                  update={update}
                  setConfig={setConfig}
                  profileData={profileData}
                  setProfileData={setProfileData}
                  contentSubTab={contentSubTab}
                  styles={styles}
                />
                </>
              )}
              {activeTab === "appearance" && (
                <AppearanceTab config={config} update={update} setConfig={setConfig} styles={styles} />
              )}
              {activeTab === "services" && (
                <ServicesTab config={config} update={update} setConfig={setConfig} styles={styles} />
              )}
              {activeTab === "account" && (
                <AccountTab
                  accountEmail={accountEmail}
                  accountNewEmail={accountNewEmail}
                  setAccountNewEmail={setAccountNewEmail}
                  accountPassword={accountPassword}
                  setAccountPassword={setAccountPassword}
                  accountConfirm={accountConfirm}
                  setAccountConfirm={setAccountConfirm}
                  accountCurrentPassword={accountCurrentPassword}
                  setAccountCurrentPassword={setAccountCurrentPassword}
                  accountMessage={accountMessage}
                  setAccountMessage={setAccountMessage}
                  accountSaving={accountSaving}
                  showPasswordConfirm={showPasswordConfirm}
                  setShowPasswordConfirm={setShowPasswordConfirm}
                  handleAccountUpdate={handleAccountUpdate}
                  pendingEmail={pendingEmail}
                  emailChangeSentAt={emailChangeSentAt}
                  onCancelPendingEmail={() => { setPendingEmail(null); setEmailChangeSentAt(null); }}
                  passwordPolicy={config.passwordPolicy ?? "secure"}
                  onPasswordPolicyChange={async (v: string) => {
                    const next = { ...config, passwordPolicy: v as "secure" | "default" };
                    setConfig(next);
                    const merged = { ...savedConfigRef.current, passwordPolicy: v } as unknown as SiteConfigData;
                    savedConfigRef.current = structuredClone(merged);
                    await saveDelta(merged);
                  }}
                  styles={styles}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
