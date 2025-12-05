"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/search");
  }, [router]);
  return (
    <div className="text-sm text-slate-700">
      Redirecting to search...
    </div>
  );
}
