import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Posts" };

export default function PostsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
