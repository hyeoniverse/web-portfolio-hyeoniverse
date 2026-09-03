"use client";

import type { Author } from "@/types/author";
import { isImageAvatar } from "@/components/ui/AuthorAvatar";
import { EmojiIcon } from "@/components/ui/EmojiPicker/EmojiIcon";
import styles from "./PostCardAuthor.module.css";

/* 카드 메타 줄의 작성자 칩 — 네 변형이 같이 쓴다. author 가 없으면 렌더하지 않는다. */
export default function PostCardAuthor({ author }: { author: Author | null }) {
  if (!author) return null;
  return (
    <span className={styles.metaAuthor} title={author.name}>
      {/* 아바타는 이미지 URL 일 수도, 이모지·아이콘일 수도 있다. 배경 이미지로 그리면
          이모지가 깨진 URL 이 되므로 판별을 AuthorAvatar 와 같은 규칙으로 맞춘다. */}
      <span
        className={styles.metaAuthorAvatar}
        style={isImageAvatar(author.avatar) ? { backgroundImage: `url(${author.avatar})` } : undefined}
        aria-hidden
      >
        {!isImageAvatar(author.avatar) && (
          author.avatar
            ? <EmojiIcon value={author.avatar} size={14} />
            : author.name.charAt(0)
        )}
      </span>
      <span className={styles.metaAuthorName}>{author.name}</span>
    </span>
  );
}
