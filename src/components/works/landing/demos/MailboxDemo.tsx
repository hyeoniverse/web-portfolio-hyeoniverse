"use client";

/* 메일함 — 사이트가 Resend 로 보내는 메일 네 가지가 화면에 들어오면 하나씩 도착하고, 누르면 내용이 펼쳐진다.
   브라우저 안에서만 흉내 내며 실제로 보내지 않는다. 화면을 벗어나면 도착이 멈췄다가 돌아오면 이어진다 */
import { useEffect, useId, useState } from "react";
import Pressable from "@/components/ui/Pressable";
import { CalendarClock, Mail, Monitor, Reply, RotateCcw, UserPlus, type LucideIcon } from "@/components/icons";
import { mailbox as copy, mails, MAIL_ARRIVE_MS, type MailIcon } from "./data";
import { prefersReducedMotion, useInView, useT } from "./hooks";
import styles from "./Demos.module.css";

const ICONS: Record<MailIcon, LucideIcon> = { reply: Reply, invite: UserPlus, device: Monitor, schedule: CalendarClock };

export default function MailboxDemo() {
  const { t } = useT();
  const uid = useId();
  const { ref, inView } = useInView<HTMLDivElement>(0.35);
  const [arrived, setArrived] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [read, setRead] = useState<ReadonlySet<number>>(() => new Set());

  /* 보이는 동안 하나씩 도착 — 움직임 줄이기면 한꺼번에 */
  useEffect(() => {
    if (!inView || arrived >= mails.length) return;
    const id = window.setTimeout(
      () => setArrived((n) => (prefersReducedMotion() ? mails.length : n + 1)),
      arrived === 0 ? MAIL_ARRIVE_MS / 2 : MAIL_ARRIVE_MS,
    );
    return () => window.clearTimeout(id);
  }, [inView, arrived]);

  const unread = Math.max(0, arrived - read.size);
  const toggle = (i: number) => {
    setOpen((now) => (now === i ? null : i));
    setRead((now) => new Set(now).add(i));
  };
  const again = () => {
    setArrived(0);
    setOpen(null);
    setRead(new Set());
  };

  return (
    <div ref={ref} className={`${styles.demo} ${styles.mailDemo}`}>
      <div className={styles.mail}>
        <p className={styles.mailHead}>
          <Mail aria-hidden="true" />
          {t(copy.inbox)}
          <span aria-live="polite">{t(copy.unread, { n: unread })}</span>
        </p>
        <ul>
          {mails.map((mail, i) => {
            const Icon = ICONS[mail.icon];
            const isIn = i < arrived;
            return (
              <li
                key={mail.icon}
                data-in={isIn || undefined}
                data-open={open === i || undefined}
                data-unread={(isIn && !read.has(i)) || undefined}
              >
                <Pressable
                  className={styles.mailRow}
                  onClick={() => toggle(i)}
                  disabled={!isIn}
                  aria-expanded={open === i}
                  aria-controls={`${uid}-mail-${i}`}
                >
                  <Icon aria-hidden="true" />
                  <span>
                    <small>{isIn ? t(mail.from) : t(copy.waiting)}</small>
                    <b>{t(mail.title)}</b>
                  </span>
                </Pressable>
                <div className={styles.mailBody} id={`${uid}-mail-${i}`}>
                  <p>{t(mail.body)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={styles.row}>
        <Pressable className={styles.ghost} onClick={again} disabled={arrived < mails.length}>
          <RotateCcw aria-hidden="true" />
          {t(copy.again)}
        </Pressable>
        <p className={styles.note}>{t(copy.note)}</p>
      </div>
    </div>
  );
}
