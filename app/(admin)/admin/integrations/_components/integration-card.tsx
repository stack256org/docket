"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  /** Setup wizard usage: header becomes a toggle for the fields below, so 5
   * sections don't all show at once. Omit on /admin/integrations, where the
   * page itself is already scoped to just these settings. */
  collapsible?: boolean;
  configured: boolean;
  defaultOpen?: boolean;
  description: string;
  note?: ReactNode;
  /** Omit for sections with no "unconfigured" state to return to (e.g. storage,
   * whose default is the equally-valid "local" driver, not "unset"). */
  onRemove?: () => void;
  onSave: () => void;
  removing?: boolean;
  saving: boolean;
  title: string;
}

/** Shared layout for the 5 integration sections on this page and in the setup
 * wizard's Integrations step — matches the bg-card/rounded-xl card pattern
 * used across /admin/appearance. */
export function IntegrationCard({
  title,
  description,
  configured,
  note,
  saving,
  removing,
  onSave,
  onRemove,
  collapsible = false,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          {title}
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium",
              configured
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {configured ? "Configured" : "Not configured"}
          </span>
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {collapsible && (
        <CaretDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform mt-0.5",
            open && "rotate-180"
          )}
        />
      )}
    </div>
  );

  const body = (
    <div className="space-y-4 pt-4">
      <div className="space-y-4">{children}</div>

      {note && (
        <p className="text-xs text-muted-foreground bg-accent/40 rounded-md px-3 py-2">
          {note}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        {configured && onRemove ? (
          <Button
            className="text-destructive hover:text-destructive"
            disabled={saving || removing}
            onClick={onRemove}
            size="sm"
            type="button"
            variant="ghost"
          >
            {removing ? "Removing…" : "Remove"}
          </Button>
        ) : (
          <span />
        )}
        <Button
          disabled={saving || removing}
          onClick={onSave}
          size="sm"
          type="button"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-soft p-6">
        {header}
        {body}
      </div>
    );
  }

  return (
    <Collapsible
      className="bg-card rounded-xl border border-border shadow-soft p-6"
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger className="w-full text-left cursor-pointer">
        {header}
      </CollapsibleTrigger>
      <CollapsibleContent>{body}</CollapsibleContent>
    </Collapsible>
  );
}
