"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import css from "../AboutStudio.module.css";
import { ABOUT_PREVIEW_PARAM, isAboutPreviewMessage, type AboutPreviewMessage } from "@/lib/about/previewMessages";
import { ExternalLink, RotateCcw } from "@/components/icons";
import Button from "@/components/ui/Button";
import { type SiteConfigData } from "@/config/site.config";
import { useLanguage } from "@/providers/LanguageProvider";

/* 미리보기 — 실제 /about 을 iframe 으로 띄우고, 저장하지 않은 설정을 보내 그대로 그리게 한다.
   페이지는 화면 크기에 맞춰 카메라를 잡으므로 데스크톱 크기(VIEW_W × VIEW_H)로 그린 뒤 칸 폭에 맞게 줄인다.
   글을 칠 때마다 보내면 장면이 매번 다시 그려지므로 잠깐 멈췄을 때 보낸다. */
const VIEW_W = 1440;
const VIEW_H = 900;
const SEND_DELAY = 250;

export default function PreviewPane({ about, anchor }: {
  about: SiteConfigData["about"];
  /** 지금 고치는 장의 목차 앵커 — 바뀌면 미리보기 카메라가 그리로 간다 */
  anchor: string;
}) {
  const { t } = useLanguage();
  const T = (k: string) => t(`admin.inline.previewPane.${k}`);
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.4);
  const [ready, setReady] = useState(false);
  const [nonce, setNonce] = useState(0);
  /* 준비 신호를 받을 때 보낼 최신 값 */
  const latest = useRef({ about, anchor });
  useEffect(() => {
    latest.current = { about, anchor };
  }, [about, anchor]);

  const post = useCallback((msg: AboutPreviewMessage) => {
    frameRef.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, []);

  /* 칸 폭에 맞춰 줄인다 */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / VIEW_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* 미리보기가 준비되면 지금 설정과 볼 곳을 보낸다 */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || !isAboutPreviewMessage(e)) return;
      if (e.data.type !== "about-preview:ready") return;
      setReady(true);
      post({ type: "about-preview:config", about: latest.current.about });
      /* 첫 그림이 자리 잡은 뒤에 옮긴다 — 바로 보내면 첫 장면 준비 중에 묻힌다 */
      window.setTimeout(() => post({ type: "about-preview:goto", anchor: latest.current.anchor }), 600);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => post({ type: "about-preview:config", about }), SEND_DELAY);
    return () => window.clearTimeout(id);
  }, [about, ready, post]);

  useEffect(() => {
    if (ready) post({ type: "about-preview:goto", anchor });
  }, [anchor, ready, post]);

  return (
    <div className={css.preview}>
      <div className={css.previewBar}>
        <span className={css.previewTitle}>{T("title")}</span>
        <Button size="sm" variant="ghost" shape="circle" icon={<RotateCcw size={14} />}
          onClick={() => { setReady(false); setNonce((n) => n + 1); }}
          aria-label={T("reload")} title={T("reload")} />
        <Button size="sm" variant="ghost" shape="circle" icon={<ExternalLink size={14} />}
          onClick={() => window.open("/about", "_blank", "noopener")}
          aria-label={T("openSaved")} title={T("openSaved")} />
      </div>
      <div ref={boxRef} className={css.previewBox} style={{ height: VIEW_H * scale }}>
        <iframe
          key={nonce}
          ref={frameRef}
          src={`/about?${ABOUT_PREVIEW_PARAM}=1`}
          title={T("frameTitle")}
          className={css.previewFrame}
          style={{ width: VIEW_W, height: VIEW_H, transform: `scale(${scale})` }}
        />
      </div>
      <p className={css.previewHint}>{T("hint")}</p>
    </div>
  );
}
