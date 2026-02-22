import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/types/post";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: Post;
  variant?: "featured" | "standard";
  onImgError?: (id: string) => void;
  imgError?: boolean;
}

export default function PostCard({
  post,
  variant = "standard",
  onImgError,
  imgError,
}: PostCardProps) {
  const date = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const readTime = Math.max(1, Math.ceil(post.content.length / 1000));
  const isFeatured = variant === "featured";
  const showImage = post.cover_image && !imgError;
  const category = post.category || null;

  return (
    <Link
      href={`/posts/${post.slug}`}
      className={`${styles.card} ${isFeatured ? styles.featured : ""}`}
    >
      <div className={styles.imageWrap}>
        {showImage ? (
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            sizes={isFeatured ? "(max-width: 768px) 100vw, 55vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            className={styles.image}
            onError={() => onImgError?.(post.id)}
          />
        ) : (
          <div className={styles.placeholder}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.badgeRow}>
          {post.is_pinned && (
            <span className={styles.pinnedBadge}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 17v5" />
                <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1h.5a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5H8a1 1 0 0 1 1 1z" />
              </svg>
              Pinned
            </span>
          )}
          {category && (
            <span className={styles.categoryBadge}>{category}</span>
          )}
        </div>

        <h2 className={styles.title}>{post.title}</h2>

        {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}

        <div className={styles.meta}>
          <span>{date}</span>
          <span className={styles.dot}>&middot;</span>
          <span>{readTime} min read</span>
          {post.view_count > 0 && (
            <>
              <span className={styles.dot}>&middot;</span>
              <span>{post.view_count} views</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
