import {
    streamText,
    ToolCallPart,
    ToolResultPart
} from "ai";

import { Messages } from "../utils/types";
import { tools } from "./tools";
import { registry } from "../utils/utils";
import { Codebase } from "../context/indexing";
import { pushNotification, write_file } from "../utils/utils";

import * as dotenv from 'dotenv';

dotenv.config();

export class LLM {
    provider: any;
    temperature: number;
    messages: Messages;
    tools: any;
    codebase: Codebase;

    constructor(provider: any, system: string | null = null, temperature: number = 0.7, codebase: Codebase) {
        this.provider = provider;        
        this.temperature = temperature
        this.messages = []
        this.tools = tools
        this.codebase = codebase

        console.log("[DEBUG] LLM constructor - codebase type:", typeof codebase);
        console.log("[DEBUG] LLM constructor - codebase constructor:", codebase?.constructor?.name);
        console.log("[DEBUG] LLM constructor - codebase has getChunk?:", typeof codebase?.getChunk);

        if (system !== null) this.messages.push({ role: 'system', content: system })
    }

    async generate(input: string | null, onChunk?: (chunk: string) => void): Promise<void> {
        if(input!==null){
            this.messages.push({ role: 'user', content: input })
        }

        const maxIterations = 25;
        let iterations = 0;

        while (iterations < maxIterations) {
            iterations++;
            
            console.log(`[DEBUG] Attempting to get language model for provider: ${this.provider}`);
            
            let model;
            try {
                model = registry.languageModel(this.provider);
                console.log(`[DEBUG] Successfully got model for provider: ${this.provider}`);
            } catch (error) {
                console.error(`[ERROR] Failed to get language model for provider: ${this.provider}`, error);
                throw new Error(`Failed to initialize language model for provider: ${this.provider}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            let response;
            try {
                response = await streamText({
                    model: model,
                    messages: this.messages,
                    temperature: this.temperature,
                    tools: this.tools,
                    toolChoice: 'auto',
                    onError({ error }) {
                        console.error("[ERROR] streamText onError callback:", error);
                    }
                });
                console.log(`[DEBUG] Successfully created streamText response for ${this.provider}`);
            } catch (error) {
                console.error(`[ERROR] Failed to create streamText for provider: ${this.provider}`, error);
                throw new Error(`Failed to generate response with provider: ${this.provider}. This might be due to missing or invalid API key. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            // Processing the response (streaming)
            let currentResponse = '';
            const collectedToolCallParts: ToolCallPart[] = [];

            for await (const part of response.fullStream) {
                switch (part.type) {
                    case 'text-delta':
                        currentResponse += part.textDelta;
                        if (onChunk) {
                            onChunk(part.textDelta);
                        }
                        break;
                    case 'tool-call':
                        collectedToolCallParts.push(part);
                        break;
                    case 'error':
                        console.error("[ERROR] Stream error occurred:", part.error);
                        throw new Error(`Streaming error: ${part.error}`);
                    default:
                        console.log("[DEBUG] Unknown part type:", part.type, part);
                        break;
                }
            }

            // Processing the tool calls (if any)
            if (collectedToolCallParts.length > 0) {
                console.log("[DEBUG] Tool calls detected:", collectedToolCallParts);

                // Adding the tool calls to the message history
                this.messages.push({
                    role: 'assistant',
                    content: [
                        ...(currentResponse ? [{ type: 'text' as const, text: currentResponse }] : []),
                        ...collectedToolCallParts
                    ]
                });

                // Executing the tool calls
                const toolResults: ToolResultPart[] = [];
                
                for (const toolCall of collectedToolCallParts) {
                    const name = toolCall.toolName;
                    const args = toolCall.args as any;
                    
                    console.log("[DEBUG] Executing tool:", name, "with args:", args);
                    
                    let toolResponseContent: any;
                    
                    try {
                        if (name === 'read_file') {
                            console.log("[INFO] Reading file: ", args.identifier);
                            console.log("[INFO] Codebase: ", this.codebase);
                            
                            if (onChunk) {
                                onChunk(`<span style="color: #888; font-size: 0.9em; display: flex; align-items: center; gap: 0.4em;">
                                  Reading ${args.identifier}
                                </span><br/>`);
                            }
                            const chunk = this.codebase.getChunk(args.identifier);
                            const content = chunk?.content || "File not found";
                            console.log("[INFO] Chunk: ", content);
                            toolResponseContent = { success: true, message: content };
                        } else if (name === 'write_file') {
                            if (onChunk) {
                                onChunk(`<span style="color: #888; font-size: 0.9em; display: flex; align-items: center; gap: 0.4em;">
                                  Writing ${args.filepath}
                                </span>\n`);
                            }
                            write_file(args.filepath, args.content);
                            console.log(`[INFO] File ${args.filepath} written successfully`);
                            toolResponseContent = { success: true, message: "File written successfully" };
                        } else {
                            console.error("[ERROR] Invalid function called: ", name, " with args: ", args);
                            toolResponseContent = `Invalid function called: ${name}`;
                        }
                    } catch (error) {
                        console.error(`[ERROR] Tool ${name} execution failed:`, error);
                        toolResponseContent = `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    }

                    toolResults.push({
                        type: 'tool-result',
                        toolCallId: toolCall.toolCallId,
                        toolName: name,
                        result: toolResponseContent,
                    });
                }

                // Add tool results to message history
                this.messages.push({
                    role: 'tool',
                    content: toolResults
                });
                
                console.log("[DEBUG] Tools executed, continuing to next iteration for follow-up response...");
                // Continue the loop to generate follow-up response
                continue;
            } else {
                // No tool calls, add the response to history and break
                if (currentResponse) {
                    console.log("[DEBUG] Adding assistant response to history, length:", currentResponse.length);
                    this.messages.push({
                        role: 'assistant',
                        content: currentResponse
                    });
                }
                break;
            }
        }

        console.log("[DEBUG] Generation complete");
    }

}