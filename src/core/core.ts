import { indexCodebase } from "./indexing";
import { LLM } from "./llm";
import { systemPrompt, generationPrompt } from "./prompts";

export async function processMessage(message: string, onChunk?: (chunk: string) => void): Promise<string | null | undefined> {
	console.log("Processing message: ", message)
    const codebase = await indexCodebase();
    const tree = codebase.generateTree();
	const llm = new LLM('gpt-4o', systemPrompt(tree), 0.7, codebase);
    const response = await llm.generate(generationPrompt(message), onChunk)
    return response;
}