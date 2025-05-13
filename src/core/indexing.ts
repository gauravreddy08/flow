import { getFiles, write_file } from './utils';
import { getParserForLanguage } from './tree-parser';
import * as vscode from 'vscode';
import fs from 'fs';
import { SyntaxNode } from 'web-tree-sitter';
import languageConfigs from './language-configs.json';

export class Chunk {
    filepath: string;
    name: string;
    content: string;
    children: Map<string, Chunk>;
    isDirectory: boolean;

    constructor(filepath: string, name: string, content: string, isDirectory: boolean) {
        this.filepath = filepath;
        this.name = name;
        this.content = content;
        this.children = new Map();
        this.isDirectory = isDirectory;
    }
}

interface LanguageConfig {
    classTypes: string[];
    functionTypes: string[];
    identifierTypes: string[];
    blockTypes: string[];
    methodTypes: string[];
    namespaceTypes: string[];
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = languageConfigs;

export class Codebase {
    root: Chunk;
    rootPath: string;
    files: Set<string>;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
        this.root = new Chunk(this.rootPath, this.rootPath.split('/').pop()!, "", true);
        this.files = new Set();
    }

    getChunk(filepath: string): Chunk | undefined {
        if (!this.files.has(filepath)) {
            return;
        }

        const absolutePath = this.root.name + filepath.replace(this.rootPath, "");
        console.log("[INFO] Absolute path: ", absolutePath)
        const breadcrumbs = absolutePath.split('/');

        let node = this.root;

        for (const crumb of breadcrumbs) {
            node = node.children.get(crumb)!;
        }

        if (node === undefined || node === null || node.isDirectory) {
            return;
        }

        return node;
    }
    async addChunk(filepath: string) {
        if (this.files.has(filepath)) return;

        const absolutePath = this.root.name + filepath.replace(this.rootPath, "");
        
        
        const breadcrumbs = absolutePath.split('/');
        let node = this.root;

        let temp = '/'

        for (let i = 0; i < breadcrumbs.length; i++) {
            const crumb = breadcrumbs[i];
            temp += crumb + '/';
            if (crumb === "") continue;
            if (crumb.startsWith('.')) return;
            if (!node.children.has(crumb)) {
                if (i === breadcrumbs.length - 1) { // Last crumb
                    const stats = fs.statSync(filepath);
                    if (stats.isFile()) {
                        console.log("Reading file", filepath);
                        const content = fs.readFileSync(filepath).toString();
                        node.children.set(crumb, new Chunk(temp, crumb, content, false));
                        node = node.children.get(crumb)!;
                        await this.chunkifyCode(node, filepath, content);
                    } else {
                        // It's a directory
                        node.children.set(crumb, new Chunk(temp, crumb, "", true));
                    }
                } else {
                    node.children.set(crumb, new Chunk(temp, crumb, "", true));
                }
            }
            node = node.children.get(crumb)!;
        }
        this.files.add(filepath);
    }

    async chunkifyCode(node: Chunk, filepath: string, content: string) {
        const ext = filepath.split('.').pop()!;

        const parser = await getParserForLanguage(ext);
        if (parser === null) {
            return;
        }
        const root = parser.parse(content).rootNode;
        this.extract(filepath, filepath, root, node);
    }

    private extract(filepath: string, identifier: string, root: SyntaxNode, chunk: Chunk) {
        const ext = identifier.split('.').pop() || '';
        const config = LANGUAGE_CONFIGS[ext] || LANGUAGE_CONFIGS['py']; 

        for (const node of root.children) {
            // Handle export statements (TypeScript specific)
            if (node.type === 'export_statement' || node.type === 'export_declaration') {
                const declaration = node.namedChildren[0];
                if (declaration) {
                    // For TypeScript, we need to look at the actual declaration inside the export
                    if (config.classTypes.includes(declaration.type)) {
                        const nameNode = declaration.namedChildren.find(n => config.identifierTypes.includes(n.type));
                        if (nameNode) {
                            const key = identifier + ':' + nameNode.text;
                            const child = new Chunk(filepath, key, declaration.text, false);
                            chunk.children.set(key, child);
                            this.files.add(key);

                            // Look for class body
                            const blockNode = declaration.namedChildren.find(n => config.blockTypes.includes(n.type));
                            if (blockNode) {
                                this.extract(filepath, key, blockNode, chunk);
                            }
                        }
                    }
                    else if (config.functionTypes.includes(declaration.type)) {
                        const nameNode = declaration.namedChildren.find(n => config.identifierTypes.includes(n.type));
                        if (nameNode) {
                            const key = identifier + "::" + nameNode.text;
                            const child = new Chunk(filepath, key, declaration.text, false);
                            chunk.children.set(key, child);
                            this.files.add(key);
                        }
                    }
                }
                continue;
            }

            // Handle regular class definitions
            if (config.classTypes.includes(node.type)) {
                const nameNode = node.namedChildren.find(n => config.identifierTypes.includes(n.type));
                if (nameNode) {
                    const key = identifier + ':' + nameNode.text;
                    const child = new Chunk(filepath, key, node.text, false);
                    chunk.children.set(key, child);
                    this.files.add(key);

                    // Look for class body/block
                    const blockNode = node.namedChildren.find(n => config.blockTypes.includes(n.type));
                    if (blockNode) {
                        this.extract(filepath, key, blockNode, chunk);
                    }
                }
            }
            // Handle regular function definitions
            else if (config.functionTypes.includes(node.type)) {
                const nameNode = node.namedChildren.find(n => config.identifierTypes.includes(n.type));
                if (nameNode) {
                    const key = identifier + "::" + nameNode.text;
                    const child = new Chunk(filepath, key, node.text, false);
                    chunk.children.set(key, child);
                    this.files.add(key);
                }
            }
            // Handle methods within classes
            else if (config.methodTypes.includes(node.type)) {
                const nameNode = node.namedChildren.find(n => config.identifierTypes.includes(n.type));
                if (nameNode) {
                    const key = identifier + "::" + nameNode.text;
                    const child = new Chunk(filepath, key, node.text, false);
                    chunk.children.set(key, child);
                    this.files.add(key);
                }
            }
            // Handle namespaces/modules
            else if (config.namespaceTypes.includes(node.type)) {
                this.extract(filepath, identifier, node, chunk);
            }
        }
    }

    generateTree(): string {
        let result = this.rootPath + "\n";

        function dfs(node: Chunk, result: string, prefix: string, isRoot: boolean = false) {
            for (const child of node.children.values()) {
                if (!isRoot) {
                    result += prefix + child.name + "\n";
                }
                result = dfs(child, result, prefix + "│   ", false);
            }
            return result;
        }

        return dfs(this.root, result, "", true);
    }
}

export async function indexCodebase() {
    const rootDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rootDir) {
        throw new Error("No directory specified");
    }

    const files: string[] = getFiles(rootDir)
    const codebase = new Codebase(rootDir);

    for (const filepath of files) {
        await codebase.addChunk(filepath)
    }

    return codebase
}








