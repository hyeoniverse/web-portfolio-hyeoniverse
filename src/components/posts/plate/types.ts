export interface EditorImageInfo {
  url: string;
  path: number[];
  /** "img" | "media_embed" */
  mediaType?: string;
}

export interface PlateEditorHandle {
  getImages: () => EditorImageInfo[];
  selectImageAt: (path: number[]) => void;
  reorderImage: (fromIdx: number, toIdx: number) => void;
  removeImage: (path: number[]) => void;
  insertImageByUrl: (url: string) => void;
  insertMediaByUrl: (url: string) => void;
}

export interface PlateEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  editorRef?: React.Ref<PlateEditorHandle>;
}
