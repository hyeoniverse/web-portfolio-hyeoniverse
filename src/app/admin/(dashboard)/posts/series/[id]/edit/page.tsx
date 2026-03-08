"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import SeriesEditor from "@/components/posts/SeriesEditor";
import type { Series } from "@/types/post";

export default function EditSeriesPage() {
  const params = useParams();
  const id = params.id as string;
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/series/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setSeries(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return null;
  if (!series) return null;

  return <SeriesEditor series={series} />;
}
