"use client";

import type {
  UseRealtimeConnectionStatus,
  UseRealtimeRunStatus,
} from "inngest/react";
import { useEffect, useRef } from "react";

import {
  Toast,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  useToastManager,
} from "@/components/ui/toast";
import type { ReceiptRealtime } from "@/hooks/use-receipt-realtime";

const TERMINAL_RUN_STATUSES = new Set(["completed", "failed", "cancelled"]);

const receiptToastManager = createToastManager();

const TOP_VIEWPORT_CLASS =
  "top-4 bottom-auto sm:right-4 sm:left-4 sm:mx-auto sm:w-auto";

const TOP_TOAST_CLASS =
  "top-0 bottom-auto left-0 origin-top [--offset-y:calc(var(--toast-offset-y)+(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y))] [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--peek))+(var(--shrink)*var(--height))))_scale(var(--scale))] after:bottom-full after:top-auto data-starting-style:[transform:translateY(-150%)] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(-150%)]";

const ReceiptToastList = () => {
  const { toasts } = useToastManager();

  return toasts.map((toastItem) => (
    <Toast
      key={toastItem.id}
      toast={toastItem}
      swipeDirection="up"
      className={TOP_TOAST_CLASS}
    >
      <ToastContent>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
};

const ReceiptToaster = () => (
  <ToastProvider toastManager={receiptToastManager}>
    <ToastPortal>
      <ToastViewport className={TOP_VIEWPORT_CLASS}>
        <ReceiptToastList />
      </ToastViewport>
    </ToastPortal>
  </ToastProvider>
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

export const ReceiptToastNotifier = ({
  realtime,
}: {
  realtime: ReceiptRealtime;
}) => {
  const toastIdRef = useRef<string | null>(null);
  const isTerminalRef = useRef(false);

  const { connectionStatus, error, runStatus, messages } = realtime;
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
      receiptToastManager.update(toastIdRef.current, {
        description,
        timeout,
        title,
        type,
      });
    } else {
      toastIdRef.current = receiptToastManager.add({
        description,
        timeout,
        title,
        type,
      });
    }
  }, [state, stateError, runStatus, connectionStatus, error]);

  useEffect(
    () => () => {
      if (toastIdRef.current && !isTerminalRef.current) {
        receiptToastManager.close(toastIdRef.current);
        toastIdRef.current = null;
      }
    },
    []
  );

  return <ReceiptToaster />;
};
