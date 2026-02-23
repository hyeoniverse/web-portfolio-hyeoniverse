import { useState, useEffect } from "react";
import { siteConfig } from "@/config/site.config";

const DEFAULT_CATEGORIES = [...siteConfig.posts.categories];

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch(() => {});
  }, []);

  return categories;
}
