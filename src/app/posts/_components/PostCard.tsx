import Link from "next/link";
import type { Post } from "@/types/post";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const date = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const readTime = Math.max(1, Math.ceil(post.content.length / 1000));

  return (
    <Link href={`/posts/${post.slug}`} className={styles.card}>
      {post.cover_image ? (
        <img
          src={post.cover_image}
          alt={post.title}
          className={styles.cover}
        />
      ) : (
        <div className={styles.coverPlaceholder}>No cover</div>
      )}

      <div className={styles.body}>
        <div className={styles.meta}>
          <span>{date}</span>
          <span>&middot;</span>
          <span>{readTime} min read</span>
        </div>

        <h2 className={styles.cardTitle}>{post.title}</h2>

        {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}

        {post.tags.length > 0 && (
          <div className={styles.tags}>
            {post.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
