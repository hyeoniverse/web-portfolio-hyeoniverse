/**
 * 직무 프리셋 — 멤버 프로필의 "직무" 칸에서 고를 수 있는 값.
 *
 * 한국어·영어를 한 쌍으로 둔다. 고르면 지금 적는 언어 칸에 넣고, 다른 언어 칸이 비어 있으면 그 짝도 같이 채운다.
 * 목록에 없는 직무는 칸에 직접 적으면 된다(프리셋은 제안일 뿐 강제하지 않는다).
 */
export interface JobTitlePreset {
  ko: string;
  en: string;
}

export const JOB_TITLE_PRESETS: JobTitlePreset[] = [
  { ko: "프론트엔드 개발자", en: "Frontend Developer" },
  { ko: "백엔드 개발자", en: "Backend Developer" },
  { ko: "풀스택 개발자", en: "Full-stack Developer" },
  { ko: "모바일 개발자", en: "Mobile Developer" },
  { ko: "게임 개발자", en: "Game Developer" },
  { ko: "데이터 엔지니어", en: "Data Engineer" },
  { ko: "데이터 분석가", en: "Data Analyst" },
  { ko: "머신러닝 엔지니어", en: "Machine Learning Engineer" },
  { ko: "DevOps 엔지니어", en: "DevOps Engineer" },
  { ko: "QA 엔지니어", en: "QA Engineer" },
  { ko: "UI/UX 디자이너", en: "UI/UX Designer" },
  { ko: "프로덕트 디자이너", en: "Product Designer" },
  { ko: "프로덕트 매니저", en: "Product Manager" },
  { ko: "프로젝트 매니저", en: "Project Manager" },
  { ko: "기획자", en: "Planner" },
];
