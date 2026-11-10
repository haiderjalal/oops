"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Pencil, RotateCcw, Trash2 } from "lucide-react";

import { Dialog } from "@/components/ui/Dialog";
import { Button, buttonStyles } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { deletePlaceAction, restorePlaceAction } from "@/features/places/actions";
import { useOwnerAction } from "@/hooks/useOwnerAction";

interface PlaceRowActionsProps {
  id: string;
  slug: string;
  title: string;
  deleted: boolean;
  live: boolean;
}

export function PlaceRowActions({ id, slug, title, deleted, live }: PlaceRowActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const { run, pending, error } = useOwnerAction();

  if (deleted) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="secondary"
          size="sm"
          loading={pending}
          onClick={() => run(() => restorePlaceAction({ id }))}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Restore
        </Button>
        {error ? (
          <p role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {live ? (
        <Link
          href={ROUTES.place(slug)}
          className={buttonStyles({ variant: "ghost", size: "sm" })}
          aria-label={`View ${title} on the site`}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
      <Link
        href={ROUTES.admin.editPlace(id)}
        className={buttonStyles({ variant: "secondary", size: "sm" })}
        aria-label={`Edit ${title}`}
      >
        <Pencil className="size-4" aria-hidden="true" />
        Edit
      </Link>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${title}`}
      >
        <Trash2 className="size-4 text-danger" aria-hidden="true" />
      </Button>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete “${title}”?`}
        className="w-[min(92vw,30rem)]"
      >
        <p className="leading-relaxed text-ink-soft">
          It disappears from the public site straight away. You can restore it later from the
          dashboard — nothing is permanently erased.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          {/* The safe action is first and focused, so a stray Enter never deletes. */}
          <Button variant="secondary" autoFocus onClick={() => setConfirming(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              run(
                () => deletePlaceAction({ id }),
                () => setConfirming(false),
              )
            }
          >
            Delete place
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
