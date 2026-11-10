"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { deletePhotoAction } from "@/features/uploads/actions";
import { useOwnerAction } from "@/hooks/useOwnerAction";

export function PhotoDeleteButton({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const { run, pending, error } = useOwnerAction();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Delete photo ${label}`}
      >
        <Trash2 className="size-4 text-danger" aria-hidden="true" />
        Delete
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this photo?"
        className="w-[min(92vw,28rem)]"
      >
        <p className="leading-relaxed text-ink-soft">
          The photo and its stored files are permanently removed. This can&rsquo;t be undone.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" autoFocus onClick={() => setOpen(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              run(
                () => deletePhotoAction({ id }),
                () => setOpen(false),
              )
            }
          >
            Delete photo
          </Button>
        </div>
      </Dialog>
    </>
  );
}
