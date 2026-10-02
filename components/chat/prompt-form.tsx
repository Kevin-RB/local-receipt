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

  const submit = () => {
    const text = input.trim();
    if (!text || isBusy) {
      return;
    }
    onSubmit(text);
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
              type="button"
              variant="secondary"
            >
              <SquareIcon />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              aria-label="Send"
              disabled={input.trim().length === 0}
              type="submit"
              variant="secondary"
            >
              <SendIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
};
