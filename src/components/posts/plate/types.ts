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
}
