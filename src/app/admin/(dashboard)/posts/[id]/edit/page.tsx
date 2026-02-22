"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PostEditor from "@/components/posts/PostEditor";
import type { Post } from "@/types/post";

export default function EditPostPage() {
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPost(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-tertiary)" }}>
        Loading...
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-tertiary)" }}>
        Post not found
      </div>
    );
  }

  return <PostEditor post={post} />;
}
