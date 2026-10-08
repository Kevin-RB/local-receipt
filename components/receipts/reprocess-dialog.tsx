"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  listExtractionModels,
  reprocessReceipt,
} from "@/app/(app)/receipts/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import type { ExtractionModels } from "@/lib/ai/models";

interface ModelChoices {
  available: string[];
  defaults: ExtractionModels;
}

/** The configured model when the provider has it loaded, else anything it does. */
const pickAvailable = (preferred: string, available: string[]) =>
  available.includes(preferred) ? preferred : (available[0] ?? preferred);

const ModelSelect = ({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string;
  onValueChange: (value: string) => void;
  options: string[];
  value: string;
}) => (
  <div className="flex flex-col gap-2">
    <Label>{label}</Label>
    {/* `items` is what lets the trigger render the selected option's name; the
        popup shows the bare model id, which is what a user needs to recognise. */}
    <Select
      items={options.map((id) => ({ label: id, value: id }))}
      onValueChange={(next) => {
        if (next !== null) {
          onValueChange(next);
        }
      }}
      value={value}
    >
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((id) => (
          <SelectItem key={id} value={id}>
            {id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

/**
 * Runs extraction again over a receipt, optionally with models other than the
 * ones the environment fixed — the point of the feature is retrying a receipt
 * that extracted badly with something stronger.
 *
 * The model list is fetched when the dialog opens rather than with the page,
 * because LM Studio is reachable from the app and not from the browser, and
 * because paying for the list on every receipts page render to populate a
 * dialog nobody opens is the wrong trade.
 */
export const ReprocessDialog = ({
  merchantName,
  onOpenChange,
  open,
  receiptId,
}: {
  merchantName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  receiptId: string;
}) => {
  const router = useRouter();
  const [models, setModels] = useState<ModelChoices | null>(null);
  const [selection, setSelection] = useState<ExtractionModels | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let current = true;

    const load = async () => {
      const reported = await listExtractionModels();

      // The dialog may have closed while the list was in flight; applying the
      // result then would leak one receipt's models into the next dialog.
      if (current) {
        setModels(reported);
        setSelection({
          // Prefer the configured default, but only when the provider actually
          // has it loaded — selecting a value the list does not contain renders
          // an empty trigger and fails validation on submit.
          ocr: pickAvailable(reported.defaults.ocr, reported.available),
          parse: pickAvailable(reported.defaults.parse, reported.available),
        });
      }
    };

    void load();

    return () => {
      current = false;
    };
  }, [open]);

  const handleReprocess = async () => {
    if (!selection) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await reprocessReceipt({
        models: selection,
        receiptId,
      });

      if (result.success) {
        onOpenChange(false);
        toast.add({ title: "Re-processing started", type: "success" });
        router.refresh();
      } else {
        toast.add({ description: result.error, title: "Re-process failed" });
      }
    } catch {
      toast.add({
        description: "Something went wrong starting the re-process",
        title: "Re-process failed",
      });
    }

    setSubmitting(false);
  };

  const selectable = Boolean(
    models && selection && models.available.length > 0
  );

  const body = (() => {
    if (!(models && selection)) {
      return <p className="text-muted-foreground text-sm">Loading models…</p>;
    }

    // Nothing to offer, and the trigger would refuse the run anyway — saying so
    // beats a select the owner can fill in that goes nowhere.
    if (models.available.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          The model server is not reachable, so re-processing cannot run right
          now.
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <ModelSelect
          label="Read the image with"
          onValueChange={(ocr) => setSelection({ ...selection, ocr })}
          options={models.available}
          value={selection.ocr}
        />
        <ModelSelect
          label="Read the receipt with"
          onValueChange={(parse) => setSelection({ ...selection, parse })}
          options={models.available}
          value={selection.parse}
        />
      </div>
    );
  })();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Re-process receipt?</DialogTitle>
          <DialogDescription>
            Extraction runs again on the stored image
            {merchantName ? ` from ${merchantName}` : ""} and{" "}
            <strong>replaces what is stored</strong>. Any manual edits and
            categories you set on this receipt will be lost.
          </DialogDescription>
        </DialogHeader>

        {body}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={!selectable || submitting}
            onClick={handleReprocess}
          >
            <RefreshCw data-icon="inline-start" />
            {submitting ? "Starting…" : "Re-process"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
