import { getModelIdentifier } from "../gui/models";
import { indexCodebase } from "./context/indexing";
import { LLM } from "./llm/llm";
import { systemPrompt, generationPrompt } from "./llm/prompts";


export async function processMessage(message: string, model: string, onChunk?: (chunk: string) => void): Promise<void> {
	console.log("Processing message: ", message, "with model: ", model)
    const codebase = await indexCodebase();
    const tree = codebase.generateTree();
    console.log("Tree: ", tree);
    let modelIdentifier = getModelIdentifier(model) || "openai:gpt-4o";
	const llm = new LLM(modelIdentifier, systemPrompt(tree), 0.7, codebase);
    await llm.generate(generationPrompt(message), onChunk)
}