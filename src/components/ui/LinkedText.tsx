"use client";

/* 안내 문구 안의 [글](주소) 를 링크로 — 번역 문구에 링크를 넣고 싶을 때(오류 안내의 "알림" · "설정 › 서비스" 등).
   새 탭으로 연다: 편집기처럼 떠나면 안 되는 화면에서 쓰인다. 주소는 사이트 안 경로(/…)만 받는다 */
import TextLink from "@/components/ui/TextLink";

const LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

export default function LinkedText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(<TextLink key={at} href={m[2]} external>{m[1]}</TextLink>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
