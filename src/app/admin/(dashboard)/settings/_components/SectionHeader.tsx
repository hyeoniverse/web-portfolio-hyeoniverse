"use client";

import type { ReactNode } from "react";
/* 섹션 헤더 버튼은 아이콘 없이 텍스트만 */
import type { SiteConfigData } from "@/config/site.config";
import { siteConfig } from "@/config/site.config";
import SectionActions from "@/components/admin/SectionActions";
import { deepEqual, getByPath } from "../_data/settingsConstants";
import localStyles from "./SectionHeader.module.css";

interface SectionHeaderProps {
  /** 섹션 타이틀 (이미 번역된 string 또는 JSX) */
  title: ReactNode;
  /** 이 섹션이 책임지는 dot-path 들. 빈 배열이면 저장 버튼 미표시 (read-only) */
  paths: string[];
  /* config 계열은 customActions 로 자체 액션을 그리는 섹션(프로필 blob 등)에서는 쓰이지 않는다.
     그런 섹션까지 더미 값을 넘기게 하지 않으려고 선택으로 둔다. */
  config?: SiteConfigData;
  savedConfig?: SiteConfigData;
  saveSection?: (paths: string[]) => Promise<unknown>;
  revertSection?: (paths: string[]) => void;
  /** 이 섹션을 siteConfig 의 기본값으로 되돌림 */
  resetSection?: (paths: string[]) => void;
  savingPaths?: string[] | null;
  /** 타이틀 우측에 함께 표시할 추가 element (hint 등) — 타이틀 옆 (gap 만큼 떨어져) 배치 */
  extra?: ReactNode;
  /** spacer (저장/되돌리기/기본값 버튼 그룹) 맨 앞에 배치할 element. toggle 등 우측 정렬용. */
  spacerExtra?: ReactNode;
  /** row 바로 아래에 SectionHeader 안에 함께 묶어 렌더할 element. drawer / 추가 컨트롤 등. */
  below?: ReactNode;
  /** 섹션 타이틀 row 의 className — 기존 sectionTitleRow 와 호환 */
  rowClassName?: string;
  /** wrap(sticky+difference) 의 className — 특정 섹션에서 blend 를 끄는 등 override 용 */
  wrapClassName?: string;
  /** 타이틀 className */
  titleClassName?: string;
  /** paths 외 추가 dirty 신호 — pending list 등 client-side side-effect 가 있을 때 활성화. */
  extraDirty?: boolean;
  /** saveSection 직전에 실행되는 hook — pending API 호출 등 처리. throw 하면 save 중단. */
  beforeSave?: () => void | Promise<void>;
  /** revertSection 와 함께 실행 — client-side pending 상태 클리어. */
  extraRevert?: () => void;
  /** spacer 의 기본 save/revert/reset 버튼 대신 렌더할 custom 액션. paths=[] 인 섹션도 spacer 표시 */
  customActions?: ReactNode;
  /** config paths 가 기본값과 같더라도 기본값(reset) 버튼을 강제로 활성화 — config 밖 데이터(ex. 게시물 태그)가
   *  기본 세트와 다를 때 사용. */
  resetForceEnabled?: boolean;
  /** 기본값(reset) 버튼 클릭 시 resetSection(paths) 대신 실행할 커스텀 핸들러. */
  onResetOverride?: () => void;
  /** 현재 탭에 필수값 위반이 있으면 저장 버튼 비활성화 (빈값 저장 차단 — saveSection 가드와 동일 규칙). */
  validationError?: string | null;
}

export default function SectionHeader({
  title,
  paths,
  config,
  savedConfig,
  saveSection,
  revertSection,
  resetSection,
  savingPaths,
  extra,
  spacerExtra,
  below,
  rowClassName,
  wrapClassName,
  titleClassName,
  extraDirty = false,
  beforeSave,
  extraRevert,
  customActions,
  resetForceEnabled = false,
  onResetOverride,
  validationError,
}: SectionHeaderProps) {

  const pathsDirty =
    !!config && !!savedConfig &&
    paths.some((p) => !deepEqual(getByPath(config, p), getByPath(savedConfig, p)));
  const dirty = pathsDirty || extraDirty;
  const isSavingThis =
    savingPaths != null && savingPaths.length === paths.length && savingPaths.every((p) => paths.includes(p));
  const isSavingOther = savingPaths != null && !isSavingThis;
  /* 기본값(reset) 버튼 비활성 조건 — config paths 가 기본값과 같고 + 강제활성(resetForceEnabled)도 아닐 때.
     resetForceEnabled 는 config 밖 데이터(게시물 태그 등)가 기본 세트와 다를 때 켜짐. */
  const configAtDefault =
    !config || paths.every((p) => deepEqual(getByPath(config, p), getByPath(siteConfig as unknown as SiteConfigData, p)));
  const isAtDefault = configAtDefault && !resetForceEnabled;

  return (
    /* 제목만 sticky + difference — 섹션 직속 요소라야 containing block 이 섹션(높이 전체)이 되어
       스크롤 내내 붙어 있고, sticky 조상에 갇히지 않아 페이지 콘텐츠와 반전된다.
       액션(버튼/링크)·hint 는 blend 밖 형제라 정상 색으로 렌더된다.
       data-settings-section — SectionJumpNav 스캔·점프 앵커(+scroll-margin-top). */
    <>
      <h2 className={`${localStyles.title} ${wrapClassName ?? ""} ${titleClassName ?? ""}`.trim()} data-settings-section>
        {title}
      </h2>
      {customActions ? (
        <div className={`${localStyles.spacer} ${rowClassName ?? ""}`.trim()}>
          {spacerExtra}
          {customActions}
        </div>
      ) : paths.length > 0 && (
        <div className={localStyles.spacer}>
          {spacerExtra}
          <SectionActions
            dirty={dirty}
            atDefault={isAtDefault}
            saving={isSavingThis}
            savingOther={isSavingOther}
            saveDisabled={!!validationError}
            onReset={resetSection ? () => (onResetOverride ? onResetOverride() : resetSection(paths)) : undefined}
            onRevert={revertSection ? () => { revertSection(paths); extraRevert?.(); } : undefined}
            onSave={async () => {
              if (beforeSave) {
                try { await beforeSave(); } catch { return; }
              }
              await saveSection?.(paths);
            }}
          />
        </div>
      )}
      {extra != null && <div className={localStyles.extraRow}>{extra}</div>}
      {below}
    </>
  );
}
