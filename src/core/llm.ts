import OpenAI from "openai";
import { tools } from "./prompts";
import { write_file } from "./utils";
import * as dotenv from 'dotenv';
import * as vscode from 'vscode';
import { Codebase } from "./indexing";

// Load environment variables
dotenv.config();

export class LLM {
    model_name: 'gpt-4o' | 'gpt-4o-mini';
    temperature: number;
    client: OpenAI;
    messages: OpenAI.ChatCompletionMessageParam[];
    tools: any;
    codebase: Codebase;
    

    constructor(model_name: 'gpt-4o' | 'gpt-4o-mini', system: string | null = null, temperature: number = 0.7, codebase: Codebase) {
        this.model_name = model_name
        this.temperature = temperature
        
        const key = process.env.OPENAI_API_KEY
        if (!key) {
            throw new Error('OPENAI_API_KEY is not set in environment variables')
        }

        this.client = new OpenAI({ apiKey: key })

        this.messages = []
        this.tools = tools
        this.codebase = codebase

        if (system !== null) this.append('system', system)
    }

    private showNotification(message: string) {
        const config = vscode.workspace.getConfiguration('flow');
        const position = config.get('notificationPosition', 'left');
        // For now, we'll just show the notification without position control
        // as VSCode's API doesn't directly support positioning notifications
        vscode.window.showInformationMessage(message);
    }

    async generate(input: string | null, onChunk?: (chunk: string) => void): Promise<string> {
        if(input!==null){
            this.append('user', input)
        }

        // If we need to handle tool calls, use non-streaming mode
        const response = await this.client.chat.completions.create({
            model: this.model_name,
            messages: this.messages,
            temperature: this.temperature,
            tools: this.tools,
            tool_choice: 'auto'
        });

        const message = response.choices[0].message;
        
        // Handle tool calls
        if (message.tool_calls) {
            // Add the assistant's message with tool calls
            this.messages.push(message);

            // Process each tool call
            for (const toolCall of message.tool_calls) {
                const name = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);
                
                let response;
                if (name === "read_file") {
                    console.log("[INFO] Reading code from: ", args.identifier);
                    this.showNotification(`Reading code from: ${args.identifier}`);
                    const chunk = this.codebase.getChunk(args.identifier);
                    response = chunk?.content || "File not found";
                    console.log("[INFO] Chunk: ", response);
                }
                else if (name === "write_file") {
                    try {
                        write_file(args.filepath, args.content);
                        response = "File written successfully";
                        console.log("[INFO] File written successfully: ", args.filepath);
                        this.showNotification(`Successfully written file: ${args.filepath}`);
                    } catch (error) {
                        response = "File update failed";
                    }
                }
                else {
                    response = "Invalid function called";
                }

                // Add the tool response
                this.messages.push({
                    role: "tool",
                    content: response,
                    tool_call_id: toolCall.id
                });
            }

            // Generate a new response after tool calls
            return this.generate(null, onChunk);
        }

        // If no tool calls, stream the response
        const stream = await this.client.chat.completions.create({
            model: this.model_name,
            messages: this.messages,
            temperature: this.temperature,
            stream: true
        });

        let fullResponse = '';
        
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullResponse += content;
                if (onChunk) {
                    onChunk(content);
                }
            }
        }

        // Add the complete response to messages
        this.messages.push({
            role: 'assistant',
            content: fullResponse
        });

        return fullResponse;
    }

    private append(role: 'user' | 'assistant' | 'system', content: string): void {
        this.messages.push({
            role: role, 
            content: content
        })
    }
}