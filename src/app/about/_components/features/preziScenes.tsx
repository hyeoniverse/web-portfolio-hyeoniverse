"use client";

/* 프레지 장면 — 기능 장 */
import { ScenePublic, SceneLayouts, SceneAdmin, SceneCms, SceneVoice, SceneVoiceWave, SceneVoiceConvert, SceneTheme } from "./Scenes";
import SceneMascot from "./SceneMascot";
import { k, type SceneDef } from "../prezi/types";

export const featuresScenes: SceneDef[] = [
  { id: "public", label: k("공개 화면", "Public site"), render: () => <ScenePublic /> },
  { id: "admin", label: k("관리자 · CMS", "Admin · CMS"), render: () => <SceneAdmin /> },
  { id: "cms", label: k("관리자를 직접", "Try the admin"), render: () => <SceneCms /> },
  { id: "layouts", label: k("작업물 레이아웃", "Work layouts"), render: () => <SceneLayouts />, heavy: true },
  { id: "theme", label: k("테마", "Themes"), render: () => <SceneTheme /> },
  { id: "mascot", label: k("3D 마스코트", "3D mascot"), render: () => <SceneMascot />, heavy: true },
  { id: "voice", label: k("발표 갤러리와 음성", "Gallery with voice"), render: () => <SceneVoice />, heavy: true },
  { id: "voice-wave", label: k("음성 파형 편집", "Waveform editing"), render: () => <SceneVoiceWave />, heavy: true },
  { id: "voice-convert", label: k("발표 파일 변환", "Deck conversion"), render: () => <SceneVoiceConvert /> },
];
