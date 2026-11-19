"use client";

import Alert from "@mui/material/Alert";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TitleChrome } from "@/components/title-chrome";
import { createBlankTrip } from "@/lib/actions/trips";

export function NewTripStarter() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = "where-are-we:new-trip";
    if (sessionStorage.getItem(key) === "pending") return;
    sessionStorage.setItem(key, "pending");
    void createBlankTrip().then((result) => {
      sessionStorage.removeItem(key);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(`/trips/${result.data.id}/edit?step=overview`);
    });
  }, [router]);

  return (
    <>
      <TitleChrome title="New trip" subtitle="Starting editor…" />
      {error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      ) : null}
    </>
  );
}
