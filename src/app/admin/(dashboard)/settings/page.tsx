"use client";

import { Fragment, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Settings as SettingsIcon } from "@/components/icons";
import { useStaticPageScroll } from "@/hooks/useStaticPageScroll";
import { useLeaveGuard } from "@/hooks/useLeaveGuard";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import { useLanguage } from "@/providers/LanguageProvider";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { FAVICON_REFRESH_EVENT } from "@/components/layout/FaviconSync";
import DiffResolver from "./_components/DiffResolver";
import SettingsSkeleton from "./_components/SettingsSkeleton";
import { profileDefaults, isProfileAllOpen, toggleProfileAll, type ProfileExpandState } from "@/components/admin/ProfileSections";
import { ProfileSectionProvider, type ProfileKey } from "@/components/admin/ProfileSectionActions";
import type { ProfileData } from "@/types/profile";
import { TAB_IDS, TAB_CONFIG_KEYS, type TabId, CONTENT_SUBTABS, type ContentSubTab, deepMerge, deepEqual, computeDelta, extractDefaults, detectConflicts, isDeltaFormat, filterOrphanedKeys, getTabForConfigPath, getContentSubTabForKey, getByPath, setByPath, type ConfigConflict } from "./_data/settingsConstants";
import { buildDeltaPayload as sharedBuildDeltaPayload } from "@/lib/settingsDelta";
import GeneralTab from "./_components/GeneralTab";
import ContentTab from "./_components/ContentTab";
import AppearanceTab from "./_components/AppearanceTab";
import ServicesTab from "./_components/ServicesTab";
import AccountTab from "./_components/AccountTab";
import SectionHeader from "./_components/SectionHeader";
import SectionJumpNav from "./_components/SectionJumpNav";
import SectionOutline from "./_components/SectionOutline";
import { useSettingsSections } from "./_hooks/useSettingsSections";
import AuthorsEditor from "./_components/AuthorsEditor";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Tooltip from "@/components/ui/Tooltip";
import ScrollButtons from "@/components/ui/ScrollButtons/ScrollButtons";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { useModalStore } from "@/stores/modalStore";
import { useAccountSettings } from "./_hooks/useAccountSettings";
import shared from "./Settings.module.css";
import local from "./page.module.css";
import { OWNER_AUTHOR_ID, withOwnerAuthor } from "@/utils/resolvePostAuthors";
import { fillTemplate } from "@/utils/format";
import type { SaveResult } from "./_types";
import Pressable from "@/components/ui/Pressable";
const styles = { ...shared, ...local };

const PROFILE_SECTION_LABELS: Record<string, string> = {
  experiences: "Experience",
  skillGroups: "Skills",
  philosophy: "Philosophy",
  approachSteps: "Approach",
  certifications: "Certifications",
  awards: "Awards",
};

/* 저장 전 검사가 비었는지 보는 값 — Appearance 의 색 칸, giscus 를 쓸 때 필요한 칸 */
const THEME_COLOR_KEYS = ["accentColor", "lightBg", "lightText", "darkBg", "darkText"] as const;
const GISCUS_REQUIRED_KEYS = ["repo", "repoId", "category", "categoryId"] as const;


export default function SettingsPage() {
  const { t, language } = useLanguage();
  useStaticPageScroll();
  const { openModal, closeModal } = useModalStore();
  const [config, setConfig] = useState<SiteConfigData>(
    structuredClone(siteConfig) as unknown as SiteConfigData
  );
  const [profileData, setProfileData] = useState<ProfileData>(
    structuredClone(profileDefaults)
  );
  // Profile sub-tab — expanded state lifted up so the header can render
  // the global "전체 펼치기/접기" button.
  const [profileExpanded, setProfileExpanded] = useState<ProfileExpandState>({
    experiences: { 0: true },
    skillGroups: {},
    philosophy: {},
    approach: {},
    certifications: {},
    awards: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPaths, setSavingPaths] = useState<string[] | null>(null);
  /** 프로필 blob 의 섹션 저장 — config 와 저장 경로가 달라 별도로 센다. */
  const [savingProfileKeys, setSavingProfileKeys] = useState<ProfileKey[] | null>(null);
  const [message, setMessage] = useState("");
  const savedConfigRef = useRef<SiteConfigData>(structuredClone(siteConfig) as unknown as SiteConfigData);
  const savedProfileRef = useRef<ProfileData>(structuredClone(profileDefaults));
  // 섹션 목록(useSettingsSections) 이 훑을 패널 컨테이너 ref.
  const panelRef = useRef<HTMLDivElement>(null);
  // 붙어 있는 사이드바와 그 틀 — 페이지 끝에서 사이드바 높이를 남은 자리에 맞춘다(아래 효과).
  const layoutRef = useRef<HTMLDivElement>(null);
  const sideNavRef = useRef<HTMLElement>(null);
  // 탭바가 고정(pin)됐는지 — sentinel 이 사이트 nav 밑으로 사라지면 스크롤한 것.
  // 고정되면 상단(nav 영역 포함)에 frost blur 를 깐다 (edit 페이지와 같은 방식).
  const navSentinelRef = useRef<HTMLDivElement>(null);
  const [navPinned, setNavPinned] = useState(false);
  useEffect(() => {
    const el = navSentinelRef.current;
    if (!el) return; // 로딩 스켈레톤 동안엔 sentinel 이 없다 — loading 이 풀리면 재실행된다
    const io = new IntersectionObserver(
      ([e]) => setNavPinned(!e.isIntersecting),
      /* 고정선 = 사이트 nav 높이(--header-height, 64px). 그 위로 sentinel 이 넘어가면 pin */
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loading]);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tab = searchParams.get("tab");
    return tab && TAB_IDS.includes(tab as TabId) ? (tab as TabId) : "general";
  });
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>(() => {
    const sub = searchParams.get("sub");
    return sub && (CONTENT_SUBTABS as readonly string[]).includes(sub)
      ? (sub as ContentSubTab)
      : "home";
  });
  /* 지금 탭의 섹션 목록과 지금 보는 섹션 — 태블릿·모바일 눈금과 데스크톱 사이드바 목록이 같이 쓴다.
     불러오는 동안에는 패널이 없어 훑을 게 없으므로, 다 불러온 뒤 다시 훑도록 loading 을 키에 넣는다. */
  const sectionNav = useSettingsSections(panelRef, `${loading ? "loading" : "ready"}:${activeTab}:${contentSubTab}`);
  /* 붙어 있는 사이드바는 틀(.layout)이 끝나면 위로 밀려 올라간다. About 에서 섹션 목록까지 펼치면
     사이드바가 화면 높이에 가까워, 푸터가 보이기 시작하는 페이지 끝에서 밀려 올라가 사이트 nav 의
     로고와 겹쳤다(nav 는 배경이 없다). 붙는 선에서 틀 끝까지 남은 자리만큼만 높이를 주면 밀리지 않고,
     사이드바가 짧아져 안에서 스크롤된다. 태블릿·모바일은 사이드바가 가로 탭 바라 CSS 가 무시한다. */
  useEffect(() => {
    const nav = sideNavRef.current;
    const layout = layoutRef.current;
    if (!nav || !layout) return;
    let raf = 0;
    const fit = () => {
      raf = 0;
      const top = parseFloat(getComputedStyle(nav).top) || 0;
      const room = Math.floor(layout.getBoundingClientRect().bottom - top);
      nav.style.setProperty("--side-nav-room", `${Math.max(160, room)}px`);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(fit); };
    fit();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [loading]);
  // 권한 게이팅 — 사이트 설정 탭은 소유자 전용, 비owner 는 account(본인 계정/프로필)만
  const [isOwnerUser, setIsOwnerUser] = useState<boolean | null>(null); // null=확인 전
  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsOwnerUser(!!d?.isOwner))
      .catch(() => setIsOwnerUser(false));
  }, []);
  const allowedTabs: TabId[] = isOwnerUser === false ? ["account"] : [...TAB_IDS];
  // 비owner 가 허용 안 된 탭에 있으면 account 로 강제. 렌더 중에 맞추고, 맞춘 뒤에는 조건이 거짓이 되어 멈춘다.
  if (isOwnerUser === false && activeTab !== "account") setActiveTab("account");
  /* 탭/서브탭 → URL 동기화 — 새로고침/북마크/공유 가능. push 아닌 replace 라 history 안 늘어남.
     첫 mount 는 skip (초기화 그대로 두기). */
  const tabSyncedRef = useRef(false);
  useEffect(() => {
    if (!tabSyncedRef.current) { tabSyncedRef.current = true; return; }
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    if (activeTab === "content") url.searchParams.set("sub", contentSubTab);
    else url.searchParams.delete("sub");
    window.history.replaceState(null, "", url.toString());
  }, [activeTab, contentSubTab]);
  const account = useAccountSettings(t);

  // ── 현재 탭/서브탭을 URL 쿼리에 반영 (새로고침·북마크·딥링크 유지) ──
  // replaceState 라 history 를 오염시키지 않음. content 탭일 때만 sub 노출.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (activeTab === "content") params.set("sub", contentSubTab);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [activeTab, contentSubTab]);

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

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/profile").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/account").then((r) => r.json()).catch(() => null),
    ]).then(([settingsRes, profileRes, accountRes]) => {
      const foundConflicts: ConfigConflict[] = [];

      // ── siteConfig 충돌 감지 ──
      /* 저장된 delta 를 손대지 않은 형태로 들고 있는다. 섹션 저장은 여기에 바뀐 경로만
         덮어써서 보낸다 — 전체 config 로 delta 를 다시 계산하면 orphan 키 제거·정규화 차이 때문에
         건드리지 않은 키까지 달라져 보이고, 비소유자 저장이 "사이트 설정은 소유자만" 으로 막힌다. */
      if (isDeltaFormat(settingsRes?.config)) storedDeltaRef.current = settingsRes.config.delta ?? {};
      else if (settingsRes?.config) storedDeltaRef.current = settingsRes.config;

      if (settingsRes?.config && Object.keys(settingsRes.config).length > 0) {
        const defaults = structuredClone(siteConfig) as unknown as SiteConfigData;
        let dbDelta: Record<string, unknown>;

        if (isDeltaFormat(settingsRes.config)) {
          dbDelta = filterOrphanedKeys(settingsRes.config.delta, defaults);
          const found = detectConflicts(
            dbDelta,
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
          dbDelta = filterOrphanedKeys(settingsRes.config, defaults);
          const diff = computeDelta(dbDelta, defaults);
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
          const merged = deepMerge(prev, dbDelta) as SiteConfigData;
          /* 이 화면은 getSiteConfig 가 아니라 여기서 직접 병합한다. 병합은 배열을 교체하므로
             DB 의 authors 가 소유자 항목을 빠뜨리고 있으면 소유자 행이 통째로 사라진다. */
          merged.authors = withOwnerAuthor(
            merged.authors,
            (siteConfig.authors as SiteConfigData["authors"] | undefined)?.find((a) => a.id === OWNER_AUTHOR_ID),
          );
          savedConfigRef.current = structuredClone(merged);
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
          /* GitHub·패널 문구도 이 화면에서 편집한다 — 여기서 빠뜨리면 저장할 때 지워진다. */
          github: c.github ?? profileDefaults.github,
          bunny: c.bunny ?? profileDefaults.bunny,
          infoBlocks: c.infoBlocks ?? profileDefaults.infoBlocks,
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
        account.setInitialData(
          accountRes.email,
          accountRes.pendingEmail ?? null,
          accountRes.emailChangeSentAt ?? null,
          accountRes.hasPassword ?? true,
        );
      }
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 저장 payload 를 만든다.
   *
   * paths 를 주면 **저장돼 있는 delta 위에 그 경로만 덮어쓴다**. 전체 config 로 delta 를
   * 다시 계산하면 손대지 않은 키까지 값이 달라진다 — 불러올 때 filterOrphanedKeys 로
   * 없어진 키를 걸러내고, 서버는 normalizeLimits 로 값을 정규화하며, 충돌 해소가 값을
   * 바꾸기도 하기 때문이다. 그러면 서버의 "authors 외 다른 키가 바뀌었는가" 검사에 걸려
   * 비소유자가 본인 프로필조차 저장하지 못한다.
   */
  const buildDeltaPayload = useCallback((fullConfig: SiteConfigData, paths?: string[]) => {
    const defaults = structuredClone(siteConfig) as unknown as SiteConfigData;
    if (paths?.length) {
      return sharedBuildDeltaPayload(storedDeltaRef.current, fullConfig, defaults, paths);
    }
    const delta = computeDelta(fullConfig, defaults);
    return { delta, savedDefaults: extractDefaults(delta, defaults) };
  }, []);

  const saveDelta = useCallback(async (fullConfig: SiteConfigData, paths?: string[]) => {
    return fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: buildDeltaPayload(fullConfig, paths) }),
    });
  }, [buildDeltaPayload]);

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

      /* 이 탭이 다루는 키 + 충돌 해소로 되돌린 경로만 저장한다. 전체 delta 재계산은
         건드리지 않은 키까지 바뀐 것처럼 보이게 만든다 (buildDeltaPayload 주석 참고). */
      const savePaths = Array.from(new Set([...keys, ...siteConfigConflicts.map((c) => c.path)]));
      const promises: Promise<Response>[] = [saveDelta(mergedConfig, savePaths)];
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
          throw new Error(body?.reason ?? body?.error ?? `HTTP ${res.status}`);
        }
      }

      savedConfigRef.current = structuredClone(mergedConfig);
      storedDeltaRef.current = structuredClone(buildDeltaPayload(mergedConfig, savePaths).delta);
      if (shouldSaveProfile) {
        savedProfileRef.current = structuredClone(mergedProfile);
        setProfileData(structuredClone(mergedProfile));
      }
      setConfig(structuredClone(mergedConfig));

      // 저장 완료 → savedDefaults 갱신됨 → 모든 충돌 해소
      setAllConflicts([]);
      setCheckedConflicts(new Set());

      setMessage(t("admin.settings.saveSuccess"));
      // 탭 favicon 즉시 갱신 (reload 전에도 최신 반영)
      try { window.dispatchEvent(new Event(FAVICON_REFRESH_EVENT)); } catch {}
      try {
        const bc = new BroadcastChannel("settings-updated");
        bc.postMessage({ type: "settings-updated", timestamp: Date.now() });
        bc.close();
      } catch {}
      // full reload로 서버 config 반영 (router.refresh()는 hydration mismatch 유발)
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMessage(`${t("admin.settings.saveError")}${msg ? ` (${msg})` : ""}`);
    } finally {
      setSaving(false);
    }
  }, [activeTab, config, profileData, allConflicts, checkedConflicts, t, saveDelta, buildDeltaPayload]);

  /* ── 프로필 섹션(experience·몽이·정보 창 등)의 저장/되돌리기/기본값 ──
     사이트 설정과 달리 이 값들은 /api/admin/profile 의 blob 하나에 들어 있다. 그래서 섹션
     저장이라 해도 blob 전체를 보내되, **저장된 값 위에 그 섹션의 키만 얹어서** 보낸다 —
     화면에서 손댄 다른 섹션까지 같이 넘어가면 "이 섹션만 저장" 이 아니게 된다. */
  const saveProfileSection = useCallback(async (keys: ProfileKey[]) => {
    setSavingProfileKeys(keys);
    setMessage("");
    try {
      const merged = structuredClone(savedProfileRef.current);
      for (const k of keys) {
        (merged as unknown as Record<string, unknown>)[k] = structuredClone(profileData[k]);
      }
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: merged, savedDefaults: profileDefaults }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.reason ?? body?.error ?? `HTTP ${res.status}`);
      }
      savedProfileRef.current = structuredClone(merged);
      setProfileData((prev) => {
        const next = structuredClone(prev);
        for (const k of keys) (next as unknown as Record<string, unknown>)[k] = structuredClone(merged[k]);
        return next;
      });
      setMessage(t("admin.settings.saveSuccess"));
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMessage(`${t("admin.settings.saveError")}${msg ? ` (${msg})` : ""}`);
      return { ok: false, reason: msg };
    } finally {
      setSavingProfileKeys(null);
    }
  }, [profileData, t]);

  const revertProfileSection = useCallback((keys: ProfileKey[]) => {
    setProfileData((prev) => {
      const next = structuredClone(prev);
      for (const k of keys) {
        (next as unknown as Record<string, unknown>)[k] = structuredClone(savedProfileRef.current[k]);
      }
      return next;
    });
  }, []);

  const resetProfileSection = useCallback((keys: ProfileKey[]) => {
    setProfileData((prev) => {
      const next = structuredClone(prev);
      for (const k of keys) {
        (next as unknown as Record<string, unknown>)[k] = structuredClone(profileDefaults[k]);
      }
      return next;
    });
  }, []);

  /** 특정 dot-path 들만 savedConfig 로 되돌리기 — 섹션 헤더의 되돌리기 버튼이 호출 */
  const revertSection = useCallback((paths: string[]) => {
    if (paths.length === 0) return;
    setConfig((prev) => {
      let next = structuredClone(prev);
      for (const p of paths) {
        next = setByPath(next, p, getByPath(savedConfigRef.current, p));
      }
      return next;
    });
  }, []);

  /** 특정 dot-path 들만 siteConfig 기본값으로 재설정 — 섹션 헤더의 기본값 버튼 */
  const resetSection = useCallback((paths: string[]) => {
    if (paths.length === 0) return;
    setConfig((prev) => {
      let next = structuredClone(prev);
      for (const p of paths) {
        next = setByPath(next, p, getByPath(siteConfig as unknown as SiteConfigData, p));
      }
      return next;
    });
  }, []);

  /* 필수값 검사 — 현재 탭 기준. 빈값이면 전역 "저장" 버튼 disable + 섹션 저장도 차단(아래 saveSection).
     하드 강제는 API(validateRequiredSettings) · DB CHECK 가 담당하고, 여기선 UX 용 사전 차단. */
  const validationError = useMemo(() => {
    if (activeTab === "general") {
      if (!String(config.personal?.name ?? "").trim()) return t("admin.settings.nameRequired");
      if (!String(config.metadata?.title ?? "").trim()) return t("admin.settings.siteTitleRequired");
      const email = String(config.contact?.email ?? "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t("admin.settings.emailInvalid");
    }
    if (activeTab === "appearance") {
      const th = (config.theme ?? {}) as Record<string, unknown>;
      /* 메시지의 색 이름은 화면의 칸 이름(Appearance 탭 ColorField 라벨)과 같은 키를 쓴다 */
      const empty = THEME_COLOR_KEYS.find((k) => !String(th[k] ?? "").trim());
      if (empty) return fillTemplate(t("admin.settings.colorRequired"), { label: t(`admin.settings.${empty}`) });
    }
    if (activeTab === "services") {
      if (config.comments?.provider === "giscus") {
        const g = (config.comments?.giscus ?? {}) as Record<string, unknown>;
        const missing = GISCUS_REQUIRED_KEYS.find((k) => !String(g[k] ?? "").trim());
        if (missing) return fillTemplate(t("admin.settings.giscusFieldRequired"), { field: missing });
      }
    }
    return null;
  }, [activeTab, config, t]);

  /** 특정 dot-path 들만 부분 저장 — 섹션 헤더의 저장 버튼이 호출 */
  /**
   * 저장해도 이 화면을 다시 받을 필요가 없는 최상위 키.
   *
   * 저장 뒤의 전체 새로고침은 루트 레이아웃이 서버에서 넘겨준 설정(네비·푸터·테마·글꼴 등)을
   * 새로 받기 위한 것이다. 아래 키들은 **다른 페이지의 내용**이라 지금 화면에 나타나지 않는다.
   * 그런데도 새로고침하면, 같은 탭에서 저장하지 않은 다른 편집이 조용히 사라진다
   * (이 화면에는 이탈 경고가 없다).
   */
  const NO_RELOAD_KEYS = useMemo(() => new Set(["authors", "posts", "works", "about"]), []);

  /** 서버에 저장돼 있는 delta 원본. 부분 저장의 기준이다. */
  const storedDeltaRef = useRef<Record<string, unknown>>({});

  /**
   * @param source 저장할 값의 출처. 방금 만든 값을 바로 저장할 때 넘긴다 —
   *   setConfig 직후에는 config state 가 아직 이전 값이라, 생략하면 낡은 값이 저장된다.
   */
  const saveSection = useCallback(async (paths: string[], source?: SiteConfigData): Promise<SaveResult> => {
    if (paths.length === 0) return { ok: false, reason: "empty-paths" };
    // 빈 필수값이면 섹션 저장도 막는다 (전역 저장 버튼과 동일 규칙 — 섹션 저장이 검증을 우회하던 버그 차단).
    /* 검증 실패는 화면 상단에 메시지가 떠 있지만, 모달 안에서 저장을 누른 경우엔 그게 가려진다.
       조용히 반환하면 "저장했는데 새로고침하면 되돌아간다" 로 나타난다 — 이유를 돌려준다. */
    if (validationError) return { ok: false, reason: validationError };
    setSavingPaths(paths);
    setMessage("");
    try {
      let merged = structuredClone(savedConfigRef.current);
      for (const p of paths) {
        merged = setByPath(merged, p, getByPath(source ?? config, p));
      }

      // 저장된 delta 에 이 섹션의 경로만 얹어 보낸다 (buildDeltaPayload 주석 참고).
      const payload = buildDeltaPayload(merged, paths);
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        /* 서버는 "왜" 를 reason 에 담는다(예: 본인 프로필만 수정할 수 있습니다).
           error 만 쓰면 "Forbidden" 밖에 안 남아 원인을 알 수 없다. */
        throw new Error(body?.reason ?? body?.error ?? `HTTP ${res.status}`);
      }
      savedConfigRef.current = structuredClone(merged);
      storedDeltaRef.current = structuredClone(payload.delta);
      /* 화면 값은 저장한 경로만 맞춘다. 예전에는 merged(저장된 값 + 이 섹션)로 통째로 바꿔서, 한 섹션을
         저장하면 다른 섹션에서 저장하지 않은 변경이 사라졌다. 저장하는 동안 고친 내용도 지키도록 최신 값 위에 얹는다. */
      const applySaved = (base: SiteConfigData) => paths.reduce((acc, p) => setByPath(acc, p, structuredClone(getByPath(merged, p))), base);
      setConfig(applySaved);
      const othersUnsaved = !deepEqual(applySaved(source ?? config), merged);
      setMessage(t("admin.settings.saveSuccess"));
      try {
        const bc = new BroadcastChannel("settings-updated");
        bc.postMessage({ type: "settings-updated", timestamp: Date.now() });
        bc.close();
      } catch {}
      /* 저장한 키가 전부 "이 화면에 안 보이는 것" 이면 새로고침하지 않는다.
         화면은 위의 setConfig 로 이미 갱신됐고, 다른 탭에는 BroadcastChannel 이 알린다.
         다른 섹션에 저장하지 않은 변경이 남아 있어도 새로고침하지 않는다 — 새로고침하면 그 변경이 사라진다. */
      const needsReload = !othersUnsaved && paths.some((p) => !NO_RELOAD_KEYS.has(p.split(".")[0]));
      if (needsReload) setTimeout(() => window.location.reload(), 600);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMessage(`${t("admin.settings.saveError")}${msg ? ` (${msg})` : ""}`);
      return { ok: false, reason: msg || t("admin.settings.saveError") };
    } finally {
      setSavingPaths(null);
    }
  }, [config, buildDeltaPayload, t, validationError, NO_RELOAD_KEYS]);

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
    setTimeout(() => window.location.reload(), 600);
  }, [saveDelta, closeModal]);

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

  const hasChanges = useMemo(() => {
    const keys = TAB_CONFIG_KEYS[activeTab] ?? [];
    for (const key of keys) {
      if (!deepEqual(config[key as keyof SiteConfigData], savedConfigRef.current[key as keyof SiteConfigData])) return true;
    }
    if (activeTab === "content" && !deepEqual(profileData, savedProfileRef.current)) return true;
    return false;
  }, [activeTab, config, profileData]);

  /* 저장하지 않은 변경이 있으면 떠나기 전에 묻는다 — 탭·하위탭 옮기기, 사이트 안 링크, 새로고침·닫기.
     예전에는 탭을 옮기면 묻지 않고 버렸다. */
  const askLeave = (go: () => void) => openModal(
    <ModalConfirm desc={t("admin.settings.leaveConfirm")} confirmText={t("admin.settings.leaveConfirmAction")} danger onConfirm={go} />,
    { width: "min(90vw, 480px)" },
  );
  useLeaveGuard(hasChanges && !saving, askLeave);
  /* 이 탭에서 바뀐 섹션 수 — 탭 저장 단추에 붙는다(섹션 머리·사이드바 목록의 점과 같은 판정) */
  const changedCount = hasChanges ? sectionNav.dirty.filter(Boolean).length : 0;
  /* 탭·하위탭 옮기기. 옮기면 저장하지 않은 변경은 버린다 — 탭 저장이 보이지 않는 하위탭의 변경까지
     저장하지 않게. 사이드바 탭, 사이드바 하위탭, 모바일 하위탭 줄이 모두 이것을 쓴다. 예전에는 모바일
     하위탭 줄만 버리지 않아 데스크톱과 결과가 달랐고, 지금 탭을 다시 눌러도 변경이 버려졌다. */
  const switchTo = (tab: TabId, sub?: ContentSubTab) => {
    const nextSub = tab === "content" ? (sub ?? "home") : contentSubTab;
    if (tab === activeTab && (tab !== "content" || nextSub === contentSubTab)) return;
    const go = () => {
      setActiveTab(tab);
      if (tab === "content") setContentSubTab(nextSub);
      setConfig(structuredClone(savedConfigRef.current));
      setProfileData(structuredClone(savedProfileRef.current));
      setConflictExpanded(false);
      setCheckedConflicts(new Set());
    };
    if (hasChanges) askLeave(go);
    else go();
  };

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
        <h1 className={styles.title}>
          <SettingsIcon size={26} strokeWidth={1.6} aria-hidden className={styles.titleIcon} />
          <T k="admin.settings.title" />
        </h1>
        <div className={styles.headerRight}>
          {activeTab === "account" ? (
            <>
              {/* 이 탭의 저자 섹션도 saveSection 을 쓴다 — message 를 여기서도 보여주지 않으면
                  모달 밖에서 저장했을 때 성공·실패가 아무데도 안 뜬다. */}
              {message && (
                <span
                  className={`${styles.message} ${message.startsWith(t("admin.settings.saveError")) ? styles.messageError : styles.messageSuccess}`}
                >
                  {message}
                </span>
              )}
              {account.accountMessage && (
                <span className={`${styles.message} ${account.accountMessage.startsWith("Error") ? styles.messageError : styles.messageSuccess}`}>
                  {account.accountMessage}
                </span>
              )}
              <Button
                variant="primary"
                size="md"
                disabled={
                  account.accountSaving ||
                  !(
                    (account.accountNewEmail.trim() !== "" && account.accountNewEmail !== account.accountEmail) ||
                    account.accountPassword !== ""
                  )
                }
                onClick={() => {
                  if (account.accountPassword && account.accountPassword !== account.accountConfirm) {
                    account.setAccountMessage(t("admin.settings.passwordMismatch"));
                    return;
                  }
                  const hasEmailChange = account.accountNewEmail !== account.accountEmail && account.accountNewEmail.trim() !== "";
                  const hasPasswordChange = !!account.accountPassword;
                  if (!hasEmailChange && !hasPasswordChange) {
                    account.setAccountMessage(t("admin.settings.noChanges"));
                    return;
                  }
                  account.setAccountMessage("");
                  account.setShowPasswordConfirm(true);
                }}
              >
                {account.accountSaving ? <T k="admin.settings.saving" /> : <T k="admin.settings.updateAccount" />}
              </Button>
            </>
          ) : (
            <>
              {(message || (hasChanges && validationError)) && (
                <span
                  className={`${styles.message} ${message.startsWith(t("admin.settings.saveError")) || validationError ? styles.messageError : styles.messageSuccess}`}
                >
                  {message || validationError}
                </span>
              )}
              {activeTab === "content" && contentSubTab === "profile" && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setProfileExpanded(toggleProfileAll(profileData, !isProfileAllOpen(profileData, profileExpanded)))}
                >
                  <T k={isProfileAllOpen(profileData, profileExpanded) ? "admin.settings.profile.collapseAll" : "admin.settings.profile.expandAll"} />
                </Button>
              )}
              <Tooltip content={t("admin.settings.resetDefaultsTooltip")} placement="bottom" delay={250}>
                <Button
                  variant="outline"
                  size="md"
                  tone="danger"
                  onClick={() => {
                    openModal(
                      <ModalConfirm
                        desc={t("admin.settings.resetDefaultsConfirm")}
                        confirmText={t("admin.settings.resetDefaults")}
                        danger
                        onConfirm={() => setConfig(structuredClone(siteConfig) as unknown as SiteConfigData)}
                      />,
                      { width: "min(90vw, 480px)" },
                    );
                  }}
                >
                  <T k="admin.settings.resetDefaults" />
                </Button>
              </Tooltip>
              <Tooltip content={t("admin.settings.revertTooltip")} placement="bottom" delay={250}>
                <Button
                  variant="outline"
                  size="md"
                  disabled={!hasChanges}
                  onClick={() => setConfig(structuredClone(savedConfigRef.current))}
                >
                  <T k="admin.settings.revert" />
                </Button>
              </Tooltip>
              {/* 탭 저장 = 이 탭에서 바뀐 곳 전부. 몇 곳인지 붙여, 섹션 저장(그 섹션만)과의 관계가 보이게 한다 */}
              <Tooltip content={changedCount === 0 ? t("admin.settings.saveTooltip")
                : changedCount === 1 ? t("admin.settings.saveTooltipOne")
                : t("admin.settings.saveTooltipMany").replace("{{n}}", String(changedCount))}
                placement="bottom" delay={250}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSave}
                  disabled={saving || !hasChanges || !!validationError}
                  aria-label={changedCount > 0 && !saving ? `${t("admin.settings.save")}, ${t("admin.settings.saveChangedLabel").replace("{{n}}", String(changedCount))}` : undefined}
                >
                  {saving ? <T k="admin.settings.saving" /> : (
                    <>
                      <T k="admin.settings.save" />
                      {changedCount > 0 && <span className={styles.saveCount} aria-hidden>{changedCount}</span>}
                    </>
                  )}
                </Button>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* 탭바 고정 감지용 sentinel — 탭바 자연 위치에 두는 0 높이 마커 */}
      <div ref={navSentinelRef} aria-hidden />
      <div className={styles.layout} ref={layoutRef}>
        {/* ── Side Nav ── edit 페이지 topBar 처럼, sticky+frost 는 이 래퍼가 맡고
            가로 스크롤(overflow)은 안쪽 nav 가 맡는다 (overflow 가 ::before frost 를 안 자르게). */}
        <div className={`${styles.tabBarSticky} ${navPinned ? styles.tabBarPinned : ""}`}>
        {/* data-lenis-prevent-wheel — 사이드바가 안에서 스크롤될 때 전역 Lenis 가 휠을 가로채지 않게.
            data-lenis-prevent 는 쓰지 않는다. AboutStudio 가 그 안의 클릭을 팝오버 안으로 보고 Hero 편집 바를 닫지 않는다. */}
        <nav className={styles.sideNav} ref={sideNavRef} data-lenis-prevent-wheel>
          {TAB_IDS.filter((id) => allowedTabs.includes(id)).map((id) => {
            const tabCount = allConflicts.filter((c) => c.tab === id).length;
            return (
              <div key={id}>
                <Pressable
                  className={`${styles.navItem} ${activeTab === id ? styles.navItemActive : ""}`}
                  onClick={() => switchTo(id)}
                >
                  {t(`admin.settings.tabs.${id}`)}
                  {tabCount > 0 && <span className={styles.navConflictBadge} />}
                </Pressable>
                {id === "content" && (
                  <div className={styles.navSub}>
                    {CONTENT_SUBTABS.map((sub) => {
                      const subCount = allConflicts.filter((c) => c.tab === "content" && c.subTab === sub).length;
                      const subActive = activeTab === "content" && contentSubTab === sub;
                      return (
                        <Fragment key={sub}>
                          <Pressable
                            className={`${styles.navSubItem} ${subActive ? styles.navSubItemActive : ""}`}
                            onClick={() => switchTo("content", sub)}
                          >
                            {t(`admin.settings.contentSub.${sub}`)}
                            {subCount > 0 && <span className={styles.navConflictBadge} />}
                          </Pressable>
                          {/* 패널이 많고 긴 About 에는 이 화면의 섹션 목록을 둔다(데스크톱만) */}
                          {subActive && sub === "about" && (
                            <SectionOutline sections={sectionNav.sections} activeIdx={sectionNav.activeIdx} onJump={sectionNav.jumpTo} dirty={sectionNav.dirty} />
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        </div>

        {/* ── Panel ── */}
        <div className={styles.panel} ref={panelRef}>
          {/* Content 하위탭(HOME/PROFILE/ABOUT/…) — 태블릿 이하에서만 보이는 가로 줄.
              섹션 바로가기(SectionJumpNav)는 이 하위탭 "아래"에 와야 계층이 맞다. */}
          {activeTab === "content" && (
            <div className={styles.mobileSubNav}>
              {CONTENT_SUBTABS.map((sub) => {
                const subCount = allConflicts.filter((c) => c.tab === "content" && c.subTab === sub).length;
                return (
                  <Pressable
                    key={sub}
                    className={`${styles.mobileSubItem} ${contentSubTab === sub ? styles.mobileSubItemActive : ""}`}
                    onClick={() => switchTo("content", sub)}
                  >
                    {t(`admin.settings.contentSub.${sub}`)}
                    {subCount > 0 && <span className={styles.navConflictBadge} />}
                  </Pressable>
                );
              })}
            </div>
          )}
          {/* 섹션 바로가기 — 섹션이 여럿이면 하위탭 아래 가로 점프 링크. 탭으로 감추지 않고 이동만. */}
          <SectionJumpNav sections={sectionNav.sections} activeIdx={sectionNav.activeIdx} onJump={sectionNav.jumpTo} pinned={navPinned} dirty={sectionNav.dirty} />
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
                    <Pressable
                      className={styles.conflictToggle}
                      onClick={() => setConflictExpanded(true)}
                    >
                      {fillTemplate(t("admin.settings.conflictMore"), { n: tabConflicts.length - PREVIEW_COUNT })}
                    </Pressable>
                  ) : conflictExpanded ? (
                    <Pressable
                      className={styles.conflictToggle}
                      onClick={() => setConflictExpanded(false)}
                    >
                      <T k="admin.settings.conflictCollapse" />
                    </Pressable>
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
                <div className={styles.tabGrid}>
                  <GeneralTab config={config} savedConfig={savedConfigRef.current} update={update} saveSection={saveSection} revertSection={revertSection} resetSection={resetSection} savingPaths={savingPaths} validationError={validationError} />
                </div>
              )}
              {activeTab === "content" && (
                <>
                <div className={`${styles.tabGrid} ${contentSubTab === "home" ? styles.tabGridSingle : ""}`}>
                  {/* 프로필 섹션의 기본값·되돌리기·섹션 저장. config 와 저장 경로가 달라
                      SectionHeader 를 못 쓰고, ContentTab 을 지나 세 컴포넌트로 갈라지므로
                      값을 일일이 내려보내는 대신 context 로 묶는다. */}
                  <ProfileSectionProvider
                    value={{
                      data: profileData,
                      savedData: savedProfileRef.current,
                      defaults: profileDefaults,
                      save: saveProfileSection,
                      revert: revertProfileSection,
                      reset: resetProfileSection,
                      savingKeys: savingProfileKeys,
                    }}
                  >
                  <ContentTab
                    config={config}
                    savedConfig={savedConfigRef.current}
                    update={update}
                    saveSection={saveSection}
                    revertSection={revertSection} resetSection={resetSection}
                    savingPaths={savingPaths}
                    validationError={validationError}
                    setConfig={setConfig}
                    profileData={profileData}
                    setProfileData={setProfileData}
                    profileExpanded={profileExpanded}
                    setProfileExpanded={setProfileExpanded}
                    contentSubTab={contentSubTab}
                  />
                  </ProfileSectionProvider>
                </div>
                </>
              )}
              {activeTab === "appearance" && (
                <div className={styles.tabGrid}>
                  <AppearanceTab config={config} savedConfig={savedConfigRef.current} update={update} saveSection={saveSection} revertSection={revertSection} resetSection={resetSection} savingPaths={savingPaths} setConfig={setConfig} validationError={validationError} />
                </div>
              )}
              {activeTab === "services" && (
                <div className={styles.tabGrid}>
                  <ServicesTab config={config} savedConfig={savedConfigRef.current} update={update} saveSection={saveSection} revertSection={revertSection} resetSection={resetSection} savingPaths={savingPaths} setConfig={setConfig} validationError={validationError} />
                </div>
              )}
              {activeTab === "account" && (
                <div className={styles.tabGrid}>
                {/* 멤버 — 작성자 프로필 + 로그인 계정 관리. owner=전체 관리 / 비owner=목록 + 본인 프로필만 수정 (이슈 #334) */}
                <section className={`${styles.section} ${styles.sectionWide}`}>
                  <SectionHeader
                    title={language === "ko" ? "멤버" : "Members"}
                    paths={["authors"]}
                    config={config}
                    savedConfig={savedConfigRef.current}
                    saveSection={saveSection}
                    revertSection={revertSection}
                    resetSection={resetSection}
                    savingPaths={savingPaths}
                    titleClassName={styles.sectionTitle}
                  />
                  <p className={styles.sectionHint}>
                    {language === "ko"
                      ? "작성자 프로필과 로그인 권한을 함께 관리합니다. 이메일로 초대하면 동일한 GitHub 계정으로 로그인 시 권한이 부여됩니다."
                      : "Manage author profiles and login access together. Invite by email — access is granted when they sign in with the matching GitHub account."}
                  </p>
                  <AuthorsEditor
                    authors={config.authors ?? []}
                    onChange={(authors) => setConfig((prev) => ({ ...prev, authors }))}
                    /* 모달에서 저장하면 그대로 저장되게 한다 — 섹션 저장을 한 번 더 누르지 않는다.
                       방금 만든 목록을 넘겨야 한다: config state 는 아직 갱신 전이다. */
                    onPersist={(authors) => saveSection(["authors"], { ...config, authors } as SiteConfigData)}
                  />
                </section>
                <AccountTab
                  accountEmail={account.accountEmail}
                  accountNewEmail={account.accountNewEmail}
                  setAccountNewEmail={account.setAccountNewEmail}
                  accountPassword={account.accountPassword}
                  setAccountPassword={account.setAccountPassword}
                  accountConfirm={account.accountConfirm}
                  setAccountConfirm={account.setAccountConfirm}
                  accountCurrentPassword={account.accountCurrentPassword}
                  setAccountCurrentPassword={account.setAccountCurrentPassword}
                  accountMessage={account.accountMessage}
                  setAccountMessage={account.setAccountMessage}
                  accountSaving={account.accountSaving}
                  showPasswordConfirm={account.showPasswordConfirm}
                  setShowPasswordConfirm={account.setShowPasswordConfirm}
                  handleAccountUpdate={account.handleAccountUpdate}
                  pendingEmail={account.pendingEmail}
                  emailChangeSentAt={account.emailChangeSentAt}
                  onCancelPendingEmail={() => { account.setPendingEmail(null); account.setEmailChangeSentAt(null); }}
                  hasPassword={account.hasPassword}
                  isOwner={isOwnerUser === true}
                  passwordPolicy={config.passwordPolicy ?? "secure"}
                  onPasswordPolicyChange={async (v: string) => {
                    const next = { ...config, passwordPolicy: v as "secure" | "default" };
                    setConfig(next);
                    const merged = { ...savedConfigRef.current, passwordPolicy: v } as unknown as SiteConfigData;
                    savedConfigRef.current = structuredClone(merged);
                    await saveDelta(merged);
                  }}
                />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ScrollButtons threshold={0} />
    </div>
  );
}
