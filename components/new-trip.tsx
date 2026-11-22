"use client";

import Alert from "@mui/material/Alert";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TitleChrome } from "@/components/title-chrome";
import { createBlankTrip, deleteTripAction } from "@/lib/actions/trips";

export function NewTripStarter() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void createBlankTrip().then((result) => {
      if (cancel) {
        if (result.ok) void deleteTripAction(result.data.id);
        return;
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(`/trips/${result.data.id}/edit?step=overview`);
    });
    return () => {
      cancel = true;
    };
  }, [router]);

  return (
    <>
      <TitleChrome backHref="/" backLabel="Back" title="New trip" subtitle="Starting editor…" />
      {error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      ) : null}
    </>
  );
}
