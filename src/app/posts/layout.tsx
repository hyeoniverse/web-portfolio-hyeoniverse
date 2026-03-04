import type { Metadata } from "next";

export const metadata: Metadata = { title: "Posts" };

export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
