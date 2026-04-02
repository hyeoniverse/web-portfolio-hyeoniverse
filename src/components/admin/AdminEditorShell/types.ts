import type { ReactNode } from "react";

export interface EditorLabels {
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
}

export interface RetranslateOption {
  key: string;
  label: string;
}

export interface RevisionEntry {
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
  onLoadRevisionDetail?: (index: number) => Promise<{ excerpt?: string; content?: string; meta?: Record<string, string> } | null>;
  onDeleteRevision?: (index: number) => Promise<boolean>;
  onRevert?: () => void;
  onRetranslate?: (fields?: string[]) => void;
  retranslateOptions?: RetranslateOption[];
  retranslateDisabled?: boolean;
  onGenerateSummary?: () => void;
  generatingSummary?: boolean;
  aiSummaryDisabled?: boolean;
  currentSnapshot?: { title: string; excerpt?: string; content?: string; meta?: Record<string, string> };
  topBarSecondRowLeft?: ReactNode;
  children: ReactNode;
}
