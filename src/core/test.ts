import { indexCodebase } from './indexing';
import { LLM } from './llm';
import { systemPrompt } from './prompts';

async function main() {
    const codebase = await indexCodebase('src');
    const tree = codebase.generateTree();
    console.log(codebase.files)
    console.log(tree)
    const llm = new LLM('gpt-4o', systemPrompt(tree), 0.7, codebase);
    const response = await llm.generate("Can you tell me what is in the prompts.ts file?");
    console.log(response);
}

main();