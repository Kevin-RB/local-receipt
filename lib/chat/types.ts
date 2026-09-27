import type { InferUITools, UIDataTypes, UIMessage } from "ai";

import type { ChatTools } from "./tools";

export type ChatToolName = keyof ChatTools & string;

export type ChatUIMessage = UIMessage<
  never,
  UIDataTypes,
  InferUITools<ChatTools>
>;
