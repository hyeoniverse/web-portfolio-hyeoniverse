import type { ReactNode } from "react";

/** Revision detail meta — nested item (sub-header + 여러 rows). 팀원/기술처럼 항목마다 여러 속성 노출용. */
interface RevisionMetaItem {
  /** sub-header — 예: 팀원 이름, 기술명. 없으면 항목 구분만. */
  title?: string;
  rows: { label: string; value: string }[];
}

/** Revision detail meta — 그룹별 묶어서 표시 (위계 + 구분선).
 *  - fields: 단일 key|value pairs (Basic / Categories / Links 등)
 *  - items: 항목별 sub-header + rows (Team / Tech / Role 등 repeating)
 *  - secondary: true 면 content 아래 별도 섹션으로 분리 (중요도 낮은 메타)
 *  - bulletValues: true 면 단일 값도 bulleted ul 로 렌더 (기술 노트 등)
 *  둘 중 하나만 사용. items 가 있으면 우선. */
export interface RevisionMetaGroup {
  label: string;
  fields?: Record<string, string>;
  items?: RevisionMetaItem[];
  secondary?: boolean;
  bulletValues?: boolean;
  /** true 면 각 row 사이 dashed separator (멤버별 구분이 필요한 팀 그룹 등) */
  separateRows?: boolean;
}

interface EditorLabels {
  delete: string;
  deleting: string;
  deleteConfirm?: string;
  deleteConfirmInput?: string;
  deleteCancel?: string;
  deleteRevisionConfirm?: string;
  preview?: string;
  saving: string;
  saveDraft: string;
  update: string;
  publish: string;
  revert?: string;
  revisionHistory?: string;
  restore?: string;
  retranslate?: string;
  retranslateAll?: string;
  retranslateDisabled?: string;
  generateSummary?: string;
  generateSummaryDisabled?: string;
  scheduledAt?: string;
  scheduledHint?: string;
  scheduledClear?: string;
  publishScheduled?: string;
  publishOptions?: string;
}

interface RetranslateOption {
  key: string;
  label: string;
}

interface RevisionEntry {
  timestamp: number;
  title: string;
  excerpt?: string;
  content?: string;
}

export interface AdminEditorShellProps {
  backHref: string;
  backLabel: string;
  editorLang: "ko" | "en";
  onEditorLangChange: (lang: "ko" | "en") => void;
  isEdit: boolean;
  isDirty?: boolean;
  saving: boolean;
  deleting: boolean;
  published: boolean;
  onDelete?: () => void;
  deleteTargetName?: string;
  onSaveDraft: () => void;
  onPublish: () => void;
  onPreview?: () => void;
  status?: string;
  statusType?: "info" | "success";
  statusTimestamp?: number;
  error?: string;
  labels: EditorLabels;
  revisions?: RevisionEntry[];
  onRestoreRevision?: (index: number) => void;
  /** revision detail 로더 — lang 인자에 맞춰 해당 언어 필드/라벨로 빌드. */
  onLoadRevisionDetail?: (index: number, lang: "ko" | "en") => Promise<{ title?: string; subtitle?: string; excerpt?: string; content?: string; meta?: RevisionMetaGroup[]; headerLabels?: { title?: string; subtitle?: string; excerpt?: string } } | null>;
  onDeleteRevision?: (index: number) => Promise<boolean>;
  onRevert?: () => void;
  onRetranslate?: (fields?: string[]) => void;
  retranslateOptions?: RetranslateOption[];
  retranslateDisabled?: boolean;
  /** AI 재번역 진행 중 — 버튼에 spinner 표시 */
  retranslating?: boolean;
  onGenerateSummary?: () => void;
  generatingSummary?: boolean;
  aiSummaryDisabled?: boolean;
  /** lang 마다 다른 라벨/필드를 갖는 현재 snapshot 빌더. revisionLang 변경 시 즉시 재계산. */
  getCurrentSnapshot?: (lang: "ko" | "en") => { title: string; subtitle?: string; excerpt?: string; content?: string; meta?: RevisionMetaGroup[]; headerLabels?: { title?: string; subtitle?: string; excerpt?: string } };
  topBarSecondRowLeft?: ReactNode;
  topBarFirstRowExtra?: ReactNode;
  /** 커버 배너 — topBar 위 최상단(전역 nav 바로 아래)에 렌더. 이게 있으면 페이지가 커버를 지나 스크롤되며 topBar 가 sticky 로 붙음. */
  coverSlot?: ReactNode;
  /** 예약 발행 값 — ISO string 또는 null. */
  scheduledAt?: string | null;
  /** 예약 발행 변경 — null 이면 해제. */
  onScheduledChange?: (iso: string | null) => void;
  /** 예약 발행 선택 가능 최소 시점. 기본 현재 시각. */
  minScheduledDate?: Date;
  children: ReactNode;
}
