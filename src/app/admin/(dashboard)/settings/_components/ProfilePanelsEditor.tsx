"use client";

import { fillTemplate } from "@/utils/format";
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
const BLOCK_NAMES: Record<string, string> = {
  c: "admin.inline.profilePanelsEditor.blockAboutCard",
  e1: "admin.inline.profilePanelsEditor.blockEasterConsole",
  e2: "admin.inline.profilePanelsEditor.blockEasterSetup",
  e3: "admin.inline.profilePanelsEditor.blockEasterSmallTalk",
  e4: "admin.inline.profilePanelsEditor.blockEasterSecret",
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
  const { t } = useLanguage();

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

  /** ko / en 한 쌍 — 다른 설정 섹션의 이중언어 입력과 같은 격자·같은 크기(md)를 쓴다.
   *  어느 쪽 언어인지는 칸 안의 KO·EN 배지가 말한다(다른 섹션과 같은 방식). */
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
          <Textarea size="md" inlineLabel="KO" maxHint={MAX_STORY_CHARS} value={value.ko} onChange={(v) => onChange({ ...value, ko: v })} rows={2} />
          <Textarea size="md" inlineLabel="EN" maxHint={MAX_STORY_CHARS} value={value.en} onChange={(v) => onChange({ ...value, en: v })} rows={2} />
        </>
      ) : (
        <>
          <Input inlineLabel="KO" value={value.ko} onChange={(v) => onChange({ ...value, ko: v })} />
          <Input inlineLabel="EN" value={value.en} onChange={(v) => onChange({ ...value, en: v })} />
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
          {t("admin.inline.profilePanelsEditor.copyForThePanel")}
        </p>

        <div className={outer.fields}>
          <FieldRow label={t("admin.inline.profilePanelsEditor.name")}>{pair(bunny.name, (v) => patchBunny({ name: v }))}</FieldRow>
          <FieldRow label={t("admin.inline.profilePanelsEditor.subtitle")}>
            {pair(bunny.subtitle, (v) => patchBunny({ subtitle: v }))}
          </FieldRow>
        </div>

        <div className={styles.listHead}>
          <span className={`${outer.sectionSubTitle} ${styles.listLabel}`}>
            {t("admin.inline.profilePanelsEditor.storyParagraphs")}
            <span className={styles.listCount}>
              {bunny.stories.length} / {MAX_STORIES}
            </span>
          </span>
          <Button
            variant="outline"
            icon={<Plus size={12} strokeWidth={2} />}
            disabled={bunny.stories.length >= MAX_STORIES}
            title={
              bunny.stories.length >= MAX_STORIES
                ? fillTemplate(t("admin.inline.profilePanelsEditor.upToMaxStories"), { MAX_STORIES })
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
            {t("admin.inline.profilePanelsEditor.addParagraph")}
          </Button>
        </div>

        {bunny.stories.length === 0 ? (
          <EmptyState size="xs" pad="sm">
            {t("admin.inline.profilePanelsEditor.noParagraphsYet")}
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
                  className={styles.removeBtn}
                  icon={<Trash2 size={13} strokeWidth={1.8} />}
                  aria-label={t("admin.inline.profilePanelsEditor.removeParagraph")}
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
          {t("admin.inline.profilePanelsEditor.contentOfTheFloating")}
        </p>

        {blocks.length === 0 ? (
          <EmptyState size="xs" pad="sm">
            {t("admin.inline.profilePanelsEditor.noInfoWindowsYet")}
          </EmptyState>
        ) : (
          <div className={styles.cards}>
            {blocks.map((block, bi) => (
              <div key={block.key} className={styles.card}>
                <div className={styles.cardHead}>
                  {/* key(c·e1…)는 코드의 자리와 짝짓는 내부 식별자다. 화면에서 고칠 수도
                      없고 뜻도 없어 이름만 보여준다. */}
                  <span className={`${outer.sectionSubTitle} ${styles.cardTitle}`}>
                    {BLOCK_NAMES[block.key] ? t(BLOCK_NAMES[block.key]) : block.key}
                  </span>
                  <Button
                    variant="outline"
                    icon={<Plus size={12} strokeWidth={2} />}
                    onClick={() =>
                      setBlocks(
                        blocks.map((b, i) =>
                          i === bi ? { ...b, lines: [...b.lines, { label: "", value: "" }] } : b,
                        ),
                      )
                    }
                  >
                    {t("admin.inline.profilePanelsEditor.addLine")}
                  </Button>
                </div>

                {block.lines.length === 0 ? (
                  <EmptyState size="xs" pad="sm">
                    {t("admin.inline.profilePanelsEditor.noLinesYet")}
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
                          className={`${outer.fieldLabel} ${styles.lineLabel}`}
                          clearable={false}
                          value={line.label}
                          onChange={(v) => patchBlockLine(bi, li, { label: v })}
                          placeholder={t("admin.inline.profilePanelsEditor.label")}
                        />
                        <Input
                          variant="underline"
                          clearable={false}
                          value={line.value}
                          onChange={(v) => patchBlockLine(bi, li, { value: v })}
                          placeholder={t("admin.inline.profilePanelsEditor.value")}
                        />
                        <Button
                          variant="ghost"
                          shape="circle"
                          className={styles.removeBtn}
                          icon={<Trash2 size={13} strokeWidth={1.8} />}
                          aria-label={t("admin.inline.profilePanelsEditor.removeLine")}
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
