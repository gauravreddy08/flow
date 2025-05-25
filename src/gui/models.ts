export const models = [
    { value: "gemini-2.5-pro-preview-05-06", label: "gemini-2.5-pro", provider: "google" },
    { value: "gpt-4o", label: "gpt-4o", provider: "openai" },
    { value: "gpt-4.1", label: "gpt-4.1", provider: "openai" },
    { value: "claude-sonnet-4-20250514", label: "claude-4-sonnet", provider: "anthropic" },
    { value: "claude-opus-4-20250514", label: "claude-4-opus", provider: "anthropic" },
];

// Precomputed map for O(1) lookups
export const modelIdentifierMap = new Map(
    models.map(model => [model.value, `${model.provider}:${model.value}`])
);

export function getModelIdentifier(modelValue: string): string {
    const identifier = modelIdentifierMap.get(modelValue);
    if (!identifier) {
        console.warn(`Model with value '${modelValue}' not found. Using value directly.`);
        return modelValue;
    }
    return identifier;
} 