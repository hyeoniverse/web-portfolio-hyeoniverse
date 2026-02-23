"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import WorkEditor from "@/components/works/WorkEditor";
import type { Work } from "@/types/work";

export default function EditWorkPage() {
  const params = useParams();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/works/${params.id}`);
      if (!res.ok) {
        setError("Work not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setWork(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ padding: "var(--spacing-3xl)", textAlign: "center", color: "var(--text-tertiary)" }}>
        Loading...
      </div>
    );
  }

  if (error || !work) {
    return (
      <div style={{ padding: "var(--spacing-3xl)", textAlign: "center", color: "var(--color-accent)" }}>
        {error || "Work not found"}
      </div>
    );
  }

  return <WorkEditor work={work} />;
}
