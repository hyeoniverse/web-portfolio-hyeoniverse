"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "@/components/icons";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Member, MembersResponse, PendingMember } from "@/types/member";
import { RoleBadge, ProviderChips } from "./MemberBadges";
import styles from "./MembersList.module.css";

interface Props {
  /** 표시할 최대 멤버 수 — 초과 시 "외 N명" + 설정 링크. (대시보드 compact 용) */
  limit?: number;
  /** 대기중 초대도 표시할지 (기본 true). */
  showInvites?: boolean;
  /** 내부 헤더(제목+카운트) 숨김 — 바깥에서 이미 제목을 렌더할 때. */
  hideHeader?: boolean;
  /** 표시 가능 여부 확정 시 호출 — 부모가 빈 섹션을 함께 숨길 수 있게. (owner 아니면 false) */
  onResolved?: (visible: boolean) => void;
}

/** OAuth 인증된 관리자 멤버 목록 — owner 전용 엔드포인트. 비owner(403)면 아무것도 렌더하지 않음. */
export default function MembersList({ limit, showInvites = true, hideHeader = false, onResolved }: Props) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [data, setData] = useState<MembersResponse | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "hidden">("loading");
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/authors/members");
        if (!res.ok) {
          if (alive) { setState("hidden"); onResolvedRef.current?.(false); } // 403(비owner) 등 — 조용히 숨김
          return;
        }
        const json = (await res.json()) as MembersResponse;
        if (alive) {
          setData(json);
          setState("ok");
          onResolvedRef.current?.(true);
        }
      } catch {
        if (alive) { setState("hidden"); onResolvedRef.current?.(false); }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state === "hidden") return null;

  const members = data?.members ?? [];
  const invites = showInvites ? (data?.pendingInvites ?? []) : [];
  const shown = limit ? members.slice(0, limit) : members;
  const overflow = limit ? members.length - shown.length : 0;

  const relative = (iso: string | null) => {
    if (!iso) return L("로그인 기록 없음", "never signed in");
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return L("방금 전", "just now");
    if (mins < 60) return L(`${mins}분 전`, `${mins}m ago`);
    const h = Math.floor(mins / 60);
    if (h < 24) return L(`${h}시간 전`, `${h}h ago`);
    const d = Math.floor(h / 24);
    if (d < 7) return L(`${d}일 전`, `${d}d ago`);
    return new Date(iso).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  return (
    <div className={styles.wrap}>
      {!hideHeader && (
        <div className={styles.header}>
          <span className={styles.title}>{L("멤버", "Members")}</span>
          <span className={styles.count}>{members.length}</span>
        </div>
      )}

      {state === "loading" ? (
        <div className={styles.empty}>{L("불러오는 중입니다…", "Loading…")}</div>
      ) : members.length === 0 && invites.length === 0 ? (
        <div className={styles.empty}>{L("아직 멤버가 없습니다.", "No members yet.")}</div>
      ) : (
        <ul className={styles.list}>
          {shown.map((m: Member) => (
            <li key={m.id} className={styles.row}>
              <span className={styles.avatar}>
                {m.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar} alt="" className={styles.avatarImg} />
                ) : (
                  <span className={styles.avatarInitial} aria-hidden>
                    {(m.name || m.email || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <div className={styles.info}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{m.name || m.email}</span>
                  <RoleBadge role={m.role} />
                </div>
                <div className={styles.meta}>
                  {m.name && <span className={styles.email}>{m.email}</span>}
                  <span className={styles.since}>
                    <Clock size={11} strokeWidth={2} />
                    {relative(m.lastSignInAt)}
                  </span>
                </div>
              </div>
              <div className={styles.providers}><ProviderChips providers={m.providers} /></div>
            </li>
          ))}

          {invites.map((iv: PendingMember) => (
            <li key={`inv-${iv.email}`} className={`${styles.row} ${styles.rowPending}`}>
              <span className={styles.avatar}>
                <span className={styles.avatarInitial} aria-hidden>
                  {iv.email.charAt(0).toUpperCase()}
                </span>
              </span>
              <div className={styles.info}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{iv.email}</span>
                  <span className={`${styles.role} ${styles.rolePendingBadge}`}>
                    {L("초대됨 · 미가입", "Invited · pending")}
                  </span>
                </div>
                <div className={styles.meta}>
                  <span className={styles.since}>
                    {L(
                      iv.level >= 2 ? "편집자 권한으로 초대했습니다." : "작성자 권한으로 초대했습니다.",
                      iv.level >= 2 ? "Invited as editor." : "Invited as author.",
                    )}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {overflow > 0 && (
        <Link href="/admin/settings" className={styles.more}>
          {L(`외 ${overflow}명 더 보기`, `+${overflow} more`)}
        </Link>
      )}
    </div>
  );
}
