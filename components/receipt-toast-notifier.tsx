"use client";

import type {
  UseRealtimeConnectionStatus,
  UseRealtimeRunStatus,
} from "inngest/react";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useReceiptRealtime } from "@/hooks/use-receipt-realtime";

const TERMINAL_RUN_STATUSES = new Set(["completed", "failed", "cancelled"]);

const ToastTitle = ({
  children,
  status,
}: {
  children: React.ReactNode;
  status: { connectionStatus: string; runStatus: string };
}) => (
  <div className="flex flex-row items-center gap-2">
    <span>{children}</span>
    <Badge variant="secondary">{status.connectionStatus}</Badge>
    <Badge variant="secondary">{status.runStatus}</Badge>
  </div>
);

interface ToastBody {
  description: string;
  timeout: number;
  title: string;
  type: "error" | "loading" | "success";
}

const resolveToastBody = (input: {
  connectionStatus: UseRealtimeConnectionStatus;
  error: Error | null;
  runStatus: UseRealtimeRunStatus;
  state: "done" | "extracting" | "failed" | "parsing" | "storing" | undefined;
  stateError: string | undefined;
}): ToastBody => {
  const { connectionStatus, error, runStatus, state, stateError } = input;

  if (error && !TERMINAL_RUN_STATUSES.has(runStatus)) {
    return {
      description: error.message,
      timeout: 0,
      title: "Connection error",
      type: "error",
    };
  }

  switch (state) {
    case "done": {
      return {
        description: "You can now have look at your receipt data",
        timeout: 10_000,
        title: "Done!",
        type: "success",
      };
    }
    case "failed": {
      return {
        description: stateError ?? "An unknown error occurred",
        timeout: 0,
        title: "Processing failed",
        type: "error",
      };
    }
    case "storing": {
      return {
        description: "Engraving data in stone",
        timeout: 0,
        title: "Storing",
        type: "loading",
      };
    }
    case "extracting": {
      return {
        description: "Gnomes are extrating data",
        timeout: 0,
        title: "Extraction",
        type: "loading",
      };
    }
    case "parsing": {
      return {
        description: "A magic cat is taking a look at your receipt",
        timeout: 0,
        title: "Understanding",
        type: "loading",
      };
    }
    default: {
      break;
    }
  }

  if (connectionStatus === "open" && runStatus === "running" && !state) {
    return {
      description: "Starting processing of your receipt",
      timeout: 0,
      title: "Possuming...",
      type: "loading",
    };
  }

  if (runStatus === "unknown") {
    return {
      description: "Staring into the void...",
      timeout: 0,
      title: "hold on...",
      type: "loading",
    };
  }

  if (runStatus === "completed") {
    return {
      description: "Receipt data is now available",
      timeout: 10_000,
      title: "Receipt processed!",
      type: "success",
    };
  }

  if (runStatus === "failed" || runStatus === "cancelled") {
    console.error("Run failed or cancelled", { error, runStatus });
    return {
      description: stateError ?? error?.message ?? "An unknown error occurred",
      timeout: 0,
      title: "Processing failed",
      type: "error",
    };
  }

  return {
    description:
      connectionStatus === "open" ? "Connected" : "Waiting for server...",
    timeout: 0,
    title: "Upload complete",
    type: "loading",
  };
};

export const ReceiptToastNotifier = ({ receiptId }: { receiptId: string }) => {
  const toastIdRef = useRef<string | null>(null);
  const isTerminalRef = useRef(false);

  const { connectionStatus, error, runStatus, messages } = useReceiptRealtime({
    receiptId,
  });
  const state = messages.byTopic.state?.data.state;
  const stateError = messages.byTopic.state?.data.error;

  useEffect(() => {
    const { description, timeout, title, type } = resolveToastBody({
      connectionStatus,
      error,
      runStatus,
      state,
      stateError,
    });

    isTerminalRef.current =
      TERMINAL_RUN_STATUSES.has(runStatus) ||
      state === "done" ||
      state === "failed";

    if (toastIdRef.current) {
      toast.update(toastIdRef.current, {
        description,
        timeout,
        title: (
          <ToastTitle status={{ connectionStatus, runStatus }}>
            {title}
          </ToastTitle>
        ),
        type,
      });
    } else {
      toastIdRef.current = toast.add({
        description,
        timeout,
        title: (
          <ToastTitle status={{ connectionStatus, runStatus }}>
            {title}
          </ToastTitle>
        ),
        type,
      });
    }
  }, [state, stateError, runStatus, connectionStatus, error]);

  useEffect(
    () => () => {
      if (toastIdRef.current && !isTerminalRef.current) {
        toast.close(toastIdRef.current);
        toastIdRef.current = null;
      }
    },
    []
  );

  return null;
};
