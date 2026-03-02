import { getInitialPostsData } from "@/lib/posts";
import PostsClient from "./PostsClient";

export const revalidate = 60;

export default async function PostsPage() {
  const initialData = await getInitialPostsData();
  return <PostsClient initialData={initialData} />;
}
