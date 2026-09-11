"use client";

import Button from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * 설정 섹션의 기본값 / 되돌리기 / 섹션 저장 버튼 묶음.
 *
 * 원래 SectionHeader 안에 박혀 있었는데, 프로필 내용처럼 저장 경로가 다른 데이터도 같은
 * 버튼이 필요해지면서 두 벌이 될 뻔했다. 라벨·비활성 조건·버튼 크기가 갈라지면 같은 화면에서
 * 섹션마다 다르게 보인다 — 모양은 여기 한 곳에 두고, "언제 활성인가" 만 부르는 쪽이 정한다.
 *
 * 이 컴포넌트는 데이터를 모른다. dirty·atDefault 판정은 각자의 저장 단위(dot-path / blob 키)에
 * 달려 있어 여기서 알 수 없다.
 */
export default function SectionActions({
  dirty,
  atDefault,
  saving = false,
  savingOther = false,
  saveDisabled = false,
  onReset,
  onRevert,
  onSave,
}: {
  /** 저장된 값과 달라졌는가 — 되돌리기·저장의 활성 조건. */
  dirty: boolean;
  /** 기본값과 같은가 — 같으면 되돌릴 기본값이 없다. */
  atDefault: boolean;
  /** 이 섹션이 저장 중. */
  saving?: boolean;
  /** 다른 섹션이 저장 중 — 동시에 두 곳을 보내지 않게 잠근다. */
  savingOther?: boolean;
  /** 필수값 위반 등 저장 자체를 막아야 할 때. */
  saveDisabled?: boolean;
  onReset?: () => void;
  onRevert?: () => void;
  onSave: () => void;
}) {
  const { t } = useLanguage();

  return (
    <>
      {onReset && (
        <Button
          variant="outline"
          size="2xs"
          disabled={atDefault || savingOther || saving}
          onClick={onReset}
          title={t("admin.settings.resetSection")}
        >
          {t("admin.settings.resetSection")}
        </Button>
      )}
      {onRevert && (
        <Button
          variant="outline"
          size="2xs"
          disabled={!dirty || savingOther || saving}
          onClick={onRevert}
          title={t("admin.settings.revertSection")}
        >
          {t("admin.settings.revertSection")}
        </Button>
      )}
      <Button
        variant="outline"
        size="2xs"
        disabled={!dirty || savingOther || saveDisabled}
        loading={saving}
        loadingVariant="wave"
        onClick={onSave}
        title={t("admin.settings.saveSectionTooltip")}
      >
        {t("admin.settings.saveSection")}
      </Button>
    </>
  );
}
