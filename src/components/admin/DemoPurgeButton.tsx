"use client";

import { useState } from "react";
import { Eraser } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { purgeDemoContentAction } from "@/features/places/actions";
import { useOwnerAction } from "@/hooks/useOwnerAction";

export function DemoPurgeButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const { run, pending, error } = useOwnerAction();

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Eraser className="size-4" aria-hidden="true" />
        Remove demo content
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Remove all demo content?"
        className="w-[min(92vw,30rem)]"
      >
        <p className="leading-relaxed text-ink-soft">
          This permanently deletes the {count} sample {count === 1 ? "place" : "places"} (plus the
          sample trips and bucket-list items). Your own content is never touched.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" autoFocus onClick={() => setOpen(false)}>
            Keep the demo
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              run(
                () => purgeDemoContentAction(),
                () => setOpen(false),
              )
            }
          >
            Remove demo content
          </Button>
        </div>
      </Dialog>
    </>
  );
}
