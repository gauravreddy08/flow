import { z } from 'zod';

export const tools = {
    write_file: {
        description: "Creates or updates a file with the specified content. This function is used to write new content to a file or to modify existing content within a file, ensuring that the file is saved at the specified path.",
        parameters: z.object({
            filepath: z.string().describe("The full path where the file should be created or edited. This includes the directory and the filename. Any missing directories in the path will be created automatically."),
            content: z.string().describe("The content that should be written into the file. If the file already exists, the content will be appended or modified accordingly to ensure consistency and completeness.")
        })
    },
    read_file: {
        description: "Reads code from a file. Can retrieve either the entire file content or specific code blocks (classes or methods). For entire file content, provide the full file path. For specific code blocks, use the format: filepath:class_name for classes, filepath::method_name for methods, or filepath:classA::method:classB for nested structures. Each class should be prefixed by : and method by ::",
        parameters: z.object({
            identifier: z.string().describe("The file identifier. Can be either a full file path (for entire file content) or a structured path (for specific code blocks) using the format: filepath:class_name, filepath::method_name, or filepath:classA::method:classB for nested structures.")
        })
    }
};