"use client";

/* 누가 무엇을 할 수 있나 — 역할을 고르면 그 칸이 강조되고, 동작을 누르면 그 판정을 지키는 곳(RLS 정책 · API 검사)이
   JWT 의 app_metadata 를 읽어 허용하거나 막는다. API 가 확인을 빠뜨려도 DB 정책이 마지막에 남는다.
   대본: 저자로 '모든 글 편집'(거부) → 관리자로 같은 동작(허용) → 관리자로 '사이트 설정'(거부) */
import { useState } from "react";
import Pressable from "@/components/ui/Pressable";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useL } from "../../features/shared";
import { GuideAnchor } from "../../guide/GuideStar";
import { roles as copy, type Role } from "./data";
import { DemoShell, useScript } from "./Script";
import styles from "./CmsDemos.module.css";

/** 대본이 누르는 줄 — copy.actions 의 '모든 글 · 작업물 편집' · '사이트 설정' */
/** 대본이 누르는 줄 — data.ts roles.actions 차례 */
const READ = 0;
const OWN = 1;
const EDIT_ALL = 2;
const SETTINGS = 4;

export default function RolesDemo() {
  const t = useL();
  const [role, setRole] = useState<Role>("author");
  const [picked, setPicked] = useState<number | null>(null);
  const action = picked === null ? null : copy.actions[picked];
  const allowed = action ? action.roles.includes(role) : false;
  const name = copy.list.find((item) => item.key === role)?.label;

  /* 대본 — 네 역할을 차례로 고르고, 역할마다 되는 일 · 막히는 일을 하나씩 눌러 본다 */
  const show = (r: Role, row: number) => () => {
    setRole(r);
    setPicked(row);
  };
  const script = useScript(() => [
    [900, show("owner", SETTINGS)],
    [2200, show("admin", EDIT_ALL)],
    [2200, show("admin", SETTINGS)],
    [2200, show("author", OWN)],
    [2200, show("author", EDIT_ALL)],
    [2200, show("visitor", READ)],
    [2200, show("visitor", OWN)],
  ]);

  return (
    <DemoShell {...script}>
      <SegmentedControl
        size="sm"
        items={copy.list.map((item) => ({ value: item.key, label: t(item.label) }))}
        value={role}
        onChange={(v) => {
          setRole(v);
          setPicked(null);
        }}
      />
      <div className={styles.tableWrap}>
        <table className={styles.roles}>
          <thead>
            <tr>
              <th scope="col">{t(copy.action)}</th>
              {copy.list.map((item) => (
                <th key={item.key} scope="col" data-on={role === item.key || undefined}>
                  {t(item.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {copy.actions.map((row, i) => (
              <tr key={row.label.en} data-picked={picked === i || undefined} data-ok={row.roles.includes(role) || undefined}>
                <th scope="row">
                  <Pressable className={styles.rowAction} aria-pressed={picked === i} onClick={() => setPicked(i)}>
                    {t(row.label)}
                  </Pressable>
                  {/* 어떻게 지키나 — 줄마다 늘 보인다(고르지 않아도 모든 동작이 설명된다) */}
                  <small className={styles.rowGuard}>{t(row.guard)}</small>
                </th>
                {copy.list.map((item) => (
                  <td key={item.key} data-on={role === item.key || undefined}>
                    {row.roles.includes(item.key) ? (
                      <i className={styles.dot} role="img" aria-label={t(copy.can)} />
                    ) : (
                      <span aria-label={t(copy.cannot)}>—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.verdict} data-kind={action ? (allowed ? "ok" : "error") : undefined} role="status">
        {action && <GuideAnchor size="1rem" priority={2} className={styles.pin} />}
        {action && name ? (
          <>
            <b>
              {t(name)} · {t(action.label)} → {t(allowed ? copy.allowed : copy.denied)}
            </b>
            <span>{t(action.guard)}</span>
          </>
        ) : (
          t(copy.idle)
        )}
      </p>
      <p className={styles.note}>{t(copy.adminNote)}</p>
    </DemoShell>
  );
}
