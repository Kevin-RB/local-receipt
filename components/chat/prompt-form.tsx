"use client";

import { SendIcon, SquareIcon } from "lucide-react";
import { useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

export const PromptForm = ({
  isBusy,
  onStop,
  onSubmit,
  placeholder,
}: {
  isBusy: boolean;
  onStop: () => void;
  onSubmit: (text: string) => void;
  placeholder: string;
}) => {
  const [input, setInput] = useState("");
  const trimmed = input.trim();
  const canSend = trimmed.length > 0;

  const submit = () => {
    if (!canSend || isBusy) {
      return;
    }
    onSubmit(trimmed);
    setInput("");
  };

  return (
    <form
      className="flex w-full flex-col gap-2 text-left"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <InputGroup>
        <InputGroupTextarea
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            // `isComposing` guards against Enter firing mid-IME input, which
            // would submit a half-typed Japanese or Chinese character.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          value={input}
        />
        <InputGroupAddon align="inline-end">
          {isBusy ? (
            <InputGroupButton
              aria-label="Stop generating"
              onClick={onStop}
              size="icon-sm"
              type="button"
              variant="secondary"
            >
              <SquareIcon />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              aria-label="Send"
              disabled={!canSend}
              size="icon-sm"
              type="submit"
              // A disabled `default` button dims lime to ~2:1 against the page.
              // `secondary` keeps the icon above 3:1 in both themes until
              // there is something to send.
              variant={canSend ? "default" : "secondary"}
            >
              <SendIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
};
