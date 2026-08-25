"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "@/components/icons";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import FieldRow from "@/components/ui/FieldRow";
import EmptyState from "@/components/ui/EmptyState";
import { useLanguage } from "@/providers/LanguageProvider";
import { bunnyProfile, profileInfoBlocks } from "@/data/profile";
import type { ProfileData, ProfileInfoBlock } from "@/types/profile";
import type { LocalizedText } from "@/types/common";
import ProfileSectionActions from "@/components/admin/ProfileSectionActions";
import SectionHeader from "./SectionHeader";
import styles from "./ProfilePanelsEditor.module.css";

/**
 * MEET(몽이) 패널과 Profile 패널의 내용 편집기.
 *
 * 둘 다 프로필 페이지의 내용인데 설정에서 손댈 수 없었다 — 몽이 소개는 번역 파일에,
 * 정보 창의 값(학교·MBTI·취향 등)은 컴포넌트 상수에 박혀 있어서 고치려면 배포를 해야 했다.
 *
 * 창의 자리(x·y·너비)는 그대로 코드에 남긴다. 그건 내용이 아니라 레이아웃이고, 화면에서
 * 겹치지 않게 맞춰 둔 값이라 설정에서 흔들면 배치가 깨진다.
 */

/**
 * 소개 문단의 한도.
 *
 * MEET 패널은 100vh 고정이고 그 안에서 3D 몽이·이름·표정 버튼과 자리를 나눠 쓴다.
 * 문단이 늘거나 길어지면 패널 밖으로 넘쳐 잘린다 — 편집할 때 막지 않으면 저장한 뒤
 * 화면에서야 잘린 걸 알게 된다.
 */
const MAX_STORIES = 5;
const MAX_STORY_CHARS = 200;

/** 창 key ↔ 화면에서 부르는 이름. key 만 보여주면 어느 창인지 알 수 없다. */
const BLOCK_NAMES: Record<string, { ko: string; en: string }> = {
  c: { ko: "소개 카드", en: "About card" },
  e1: { ko: "이스터에그 · 콘솔", en: "Easter egg · console" },
  e2: { ko: "이스터에그 · 작업 환경", en: "Easter egg · setup" },
  e3: { ko: "이스터에그 · 잡담", en: "Easter egg · small talk" },
  e4: { ko: "이스터에그 · 비밀", en: "Easter egg · secret" },
};

export default function ProfilePanelsEditor({
  data, setData, styles: outer, shared,
}: {
  data: ProfileData;
  setData: Dispatch<SetStateAction<ProfileData>>;
  /* 다른 섹션과 같은 껍데기(.section / .sectionTitle / .sectionHint / .fields)를 쓰려면
     설정 화면의 스타일이 필요하다. */
  styles: Record<string, string>;
  shared: Record<string, string>;
}) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);

  const bunny = data.bunny ?? bunnyProfile;
  const blocks = data.infoBlocks ?? profileInfoBlocks;

  const patchBunny = (next: Partial<typeof bunny>) =>
    setData((d) => ({ ...d, bunny: { ...(d.bunny ?? bunnyProfile), ...next } }));

  const setStories = (stories: LocalizedText[]) => patchBunny({ stories });
  const setBlocks = (next: ProfileInfoBlock[]) => setData((d) => ({ ...d, infoBlocks: next }));

  const patchBlockLine = (bi: number, li: number, next: Partial<{ label: string; value: string }>) =>
    setBlocks(
      blocks.map((b, i) =>
        i !== bi ? b : { ...b, lines: b.lines.map((l, j) => (j === li ? { ...l, ...next } : l)) },
      ),
    );

  /** ko / en 한 쌍 — 다른 설정 섹션의 이중언어 입력과 같은 격자를 쓴다. */
  const pair = (
    value: LocalizedText,
    onChange: (next: LocalizedText) => void,
    multiline = false,
  ) => (
    <div className={outer.fieldPair}>
      {multiline ? (
        <>
          {/* maxHint — 카운터가 뜨고 한도를 넘긴 글자에 표시가 붙는다. 잘라내지는 않아서
              쓰는 도중에 문장이 끊기지 않고, 넘겼다는 건 바로 보인다. */}
          <Textarea size="sm" maxHint={MAX_STORY_CHARS} value={value.ko} onChange={(v) => onChange({ ...value, ko: v })} placeholder="한국어" rows={2} />
          <Textarea size="sm" maxHint={MAX_STORY_CHARS} value={value.en} onChange={(v) => onChange({ ...value, en: v })} placeholder="English" rows={2} />
        </>
      ) : (
        <>
          <Input size="sm" value={value.ko} onChange={(v) => onChange({ ...value, ko: v })} placeholder="한국어" />
          <Input size="sm" value={value.en} onChange={(v) => onChange({ ...value, en: v })} placeholder="English" />
        </>
      )}
    </div>
  );

  return (
    <>
      <section className={`${outer.section} ${shared.sectionWide}`}>
        {/* 다른 설정 섹션과 같은 헤더 — 제목은 sticky, 액션은 우측 열. */}
        <SectionHeader
          title="MEET"
          paths={[]}
          titleClassName={outer.sectionTitle}
          customActions={<ProfileSectionActions keys={["bunny"]} />}
        />
        <p className={outer.sectionHint}>
          {L(
            "몽이를 소개하는 패널의 문구입니다. 표정 버튼의 이름은 번역 파일에서 관리합니다.",
            "Copy for the panel that introduces Mongi. The expression button labels live in the translation files.",
          )}
        </p>

        <div className={outer.fields}>
          <FieldRow label={L("이름", "Name")}>{pair(bunny.name, (v) => patchBunny({ name: v }))}</FieldRow>
          <FieldRow label={L("한 줄 소개", "Subtitle")}>
            {pair(bunny.subtitle, (v) => patchBunny({ subtitle: v }))}
          </FieldRow>
        </div>

        <div className={styles.listHead}>
          <span className={`${outer.sectionSubTitle} ${styles.listLabel}`}>
            {L("소개 문단", "Story paragraphs")}
            <span className={styles.listCount}>
              {bunny.stories.length} / {MAX_STORIES}
            </span>
          </span>
          <Button
            variant="outline"
            size="2xs"
            icon={<Plus size={12} strokeWidth={2} />}
            disabled={bunny.stories.length >= MAX_STORIES}
            title={
              bunny.stories.length >= MAX_STORIES
                ? L(`문단은 ${MAX_STORIES}개까지 넣을 수 있습니다.`, `Up to ${MAX_STORIES} paragraphs.`)
                : undefined
            }
            onClick={() =>
              setStories(
                bunny.stories.length >= MAX_STORIES
                  ? bunny.stories
                  : [...bunny.stories, { ko: "", en: "" }],
              )
            }
          >
            {L("문단 추가", "Add paragraph")}
          </Button>
        </div>

        {bunny.stories.length === 0 ? (
          <EmptyState size="xs" pad="sm">
            {L("문단이 없습니다.", "No paragraphs yet.")}
          </EmptyState>
        ) : (
          <ol className={styles.storyList}>
            {bunny.stories.map((story, i) => (
              /* 번호 · 입력 · 삭제를 한 줄에. 카드로 감싸면 문단 하나가 세 줄을 먹는다. */
              <li key={i} className={styles.storyRow}>
                <span className={styles.rowIndex}>{i + 1}</span>
                {pair(story, (v) => setStories(bunny.stories.map((s, j) => (j === i ? v : s))), true)}
                <Button
                  variant="ghost"
                  shape="circle"
                  size="xs"
                  className={styles.removeBtn}
                  icon={<Trash2 size={13} strokeWidth={1.8} />}
                  aria-label={L("문단 삭제", "Remove paragraph")}
                  onClick={() => setStories(bunny.stories.filter((_, j) => j !== i))}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 아래 EXPERIENCE·SKILLS 처럼 2열 그리드에 들어간다. 전폭으로 두면 내용은
          왼쪽 절반에만 차고 오른쪽이 통째로 빈다 — 라벨:값 한 줄짜리라 폭이 필요 없다. */}
      <section className={outer.section}>
        <SectionHeader
          title="PROFILE"
          paths={[]}
          titleClassName={outer.sectionTitle}
          customActions={<ProfileSectionActions keys={["infoBlocks"]} />}
        />
        <p className={outer.sectionHint}>
          {L(
            "프로필 패널에 떠 있는 정보 창의 내용입니다. 이름·역할·연락처 창은 일반 탭의 계정 정보를 씁니다.",
            "Content of the floating info windows. The name/role/contact window uses the account info from the General tab.",
          )}
        </p>

        {blocks.length === 0 ? (
          <EmptyState size="xs" pad="sm">
            {L("정보 창이 없습니다.", "No info windows yet.")}
          </EmptyState>
        ) : (
          <div className={styles.cards}>
            {blocks.map((block, bi) => (
              <div key={block.key} className={styles.card}>
                <div className={styles.cardHead}>
                  {/* key(c·e1…)는 코드의 자리와 짝짓는 내부 식별자다. 화면에서 고칠 수도
                      없고 뜻도 없어 이름만 보여준다. */}
                  <span className={`${outer.sectionSubTitle} ${styles.cardTitle}`}>
                    {BLOCK_NAMES[block.key] ? L(BLOCK_NAMES[block.key].ko, BLOCK_NAMES[block.key].en) : block.key}
                  </span>
                  <Button
                    variant="outline"
                    size="2xs"
                    icon={<Plus size={12} strokeWidth={2} />}
                    onClick={() =>
                      setBlocks(
                        blocks.map((b, i) =>
                          i === bi ? { ...b, lines: [...b.lines, { label: "", value: "" }] } : b,
                        ),
                      )
                    }
                  >
                    {L("줄 추가", "Add line")}
                  </Button>
                </div>

                {block.lines.length === 0 ? (
                  <EmptyState size="xs" pad="sm">
                    {L("줄이 없습니다.", "No lines yet.")}
                  </EmptyState>
                ) : (
                  <ul className={styles.lines}>
                    {block.lines.map((line, li) => (
                      /* 항목 : 내용 한 줄. 화면에서도 이 순서로 보이므로 폭도 좁게 : 넓게 둔다. */
                      <li key={li} className={styles.line}>
                        {/* 알약 두 개가 줄마다 나란히 놓이면 스무 개 넘는 테두리가 겹쳐 보인다.
                            아래 철학·프로세스 목록과 같은 밑줄 입력으로 맞춘다. */}
                        <Input
                          variant="underline"
                          size="sm"
                          className={`${outer.fieldLabel} ${styles.lineLabel}`}
                          clearable={false}
                          value={line.label}
                          onChange={(v) => patchBlockLine(bi, li, { label: v })}
                          placeholder={L("항목", "Label")}
                        />
                        <Input
                          variant="underline"
                          size="sm"
                          clearable={false}
                          value={line.value}
                          onChange={(v) => patchBlockLine(bi, li, { value: v })}
                          placeholder={L("내용", "Value")}
                        />
                        <Button
                          variant="ghost"
                          shape="circle"
                          size="xs"
                          className={styles.removeBtn}
                          icon={<Trash2 size={13} strokeWidth={1.8} />}
                          aria-label={L("줄 삭제", "Remove line")}
                          onClick={() =>
                            setBlocks(
                              blocks.map((b, i) =>
                                i === bi ? { ...b, lines: b.lines.filter((_, j) => j !== li) } : b,
                              ),
                            )
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
