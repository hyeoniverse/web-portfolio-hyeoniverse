import type { SlateEditor, TElement } from "platejs";

/** 프로젝트 전반에서 Plate 의 editor 인자를 받을 때 사용하는 별칭.
 *  `any` 대신 사용하되, Plate 의 모든 transform/api 를 노출하므로 캐스팅 없이 호출 가능. */
export type PlateEditor = SlateEditor;

/** Slate node 의 동적 필드 (type, background, footnoteId 등 plugin 정의 필드) 까지 인덱싱 가능한 record 형태 */
export type PlateNode = TElement & Record<string, unknown>;

export interface EditorImageInfo {
  url: string;
  path: number[];
  /** "img" | "media_embed" */
  mediaType?: string;
  /** 본문에서 제거되었지만 패널에 남아 있는 미디어 */
  detached?: boolean;
}

export interface PlateEditorHandle {
  getImages: () => EditorImageInfo[];
  selectImageAt: (path: number[]) => void;
  reorderImage: (fromIdx: number, toIdx: number) => void;
  removeImage: (path: number[]) => void;
  insertImageByUrl: (url: string) => void;
  insertMediaByUrl: (url: string) => void;
  removeDetached: (url: string) => void;
}

export interface PlateEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  editorRef?: React.Ref<PlateEditorHandle>;
  /** 게시물 작성 언어 (폰트 그룹 정렬에 사용) */
  postLang?: "ko" | "en";
}
