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
  /** HTML 소스 모드 토글 — 버튼을 에디터 밖(제목 라인 등)에 둘 때 사용 */
  toggleHtmlMode: () => void;
}

export interface PlateEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  editorRef?: React.Ref<PlateEditorHandle>;
  /** 게시물 작성 언어 (폰트 그룹 정렬에 사용) */
  postLang?: "ko" | "en";
  /** HTML 소스 모드 변화 통지 — 외부 토글 버튼의 active 표시용 */
  onHtmlModeChange?: (htmlMode: boolean) => void;
}
