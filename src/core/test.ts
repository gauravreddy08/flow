import { LLM } from "./llm/llm";
import { Codebase } from "./context/indexing";
import { systemPrompt } from "./llm/prompts";

const codebase = new Codebase("src/core");
const llm = new LLM("openai:gpt-4o", systemPrompt(codebase.generateTree()), 0.7, codebase);

llm.generate("Write a vegetarian lasagna recipe for 4 people.");