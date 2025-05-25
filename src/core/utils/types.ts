import {
    CoreAssistantMessage,
    CoreSystemMessage,
    CoreToolMessage,
    CoreUserMessage,
} from "ai";

export type Messages = Array<CoreSystemMessage | CoreUserMessage | CoreAssistantMessage | CoreToolMessage>; 