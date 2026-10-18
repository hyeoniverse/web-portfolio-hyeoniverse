import type { Metadata } from "next";
import { getTilData } from "@/lib/posts";
import TilClient from "./TilClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "TIL",
  description: "Today I Learned — 매일 배운 것을 잔디로 쌓는 기록",
};

/* /posts/til — 설정 posts.tilTag 태그가 붙은 글을 1년 잔디로 보여 준다. 잔디를 누르면 그날의 기록이 아래에 펼쳐진다 */
export default async function TilPage() {
  const { tag, entries } = await getTilData();
  return <TilClient tag={tag} entries={entries} />;
}
