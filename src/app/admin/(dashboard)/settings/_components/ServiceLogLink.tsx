"use client";

/* 이 기능의 서비스 호출 기록으로 — 섹션 제목 줄 오른쪽(저장 단추 앞)에 둔다.
   query 로 기록 페이지를 거른 채 연다(/admin/service-log?category=…&provider=a,b). */
import { History } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";

export default function ServiceLogLink({ query }: { query: Record<string, string | string[]> }) {
  const { t } = useLanguage();
  const params = new URLSearchParams(
    Object.entries(query).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v]),
  );
  const label = t("admin.aiHealth.logOpenSection");
  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size="sm"
        shape="circle"
        href={`/admin/service-log?${params.toString()}`}
        aria-label={label}
        soundDisabled
        icon={<History size={14} strokeWidth={2} />}
      />
    </Tooltip>
  );
}
