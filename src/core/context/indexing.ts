import { getFiles } from '../utils/utils';
import { getParserForLanguage } from './tree-parser';
import * as vscode from 'vscode';
import fs from 'fs';
import { SyntaxNode } from 'web-tree-sitter';
import languageConfigs from '../context/language-configs.json';

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
    ignoreDirs: string[];
    binaryExtensions: string[];

    constructor(rootPath: string) {
        this.rootPath = rootPath;
        this.root = new Chunk(this.rootPath, this.rootPath.split('/').pop()!, "", true);
        this.files = new Set();
        
        // Standard directories to ignore
        this.ignoreDirs = [
            'node_modules', 
            '.git', 
            'dist', 
            'build', 
            '.next', 
            '.cache', 
            '.vscode', 
            '.idea', 
            'coverage'
        ];
        
        // Binary file extensions to ignore
        this.binaryExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', 
            '.woff', '.woff2', '.ttf', '.eot', '.otf', 
            '.zip', '.tar', '.gz', '.rar', '.7z',
            '.mp3', '.mp4', '.mov', '.avi', '.wmv', '.flv',
            '.pdf', '.exe', '.dll', '.so', '.dylib'
        ];
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

        try {
            // Skip files in ignored directories and binary files
            if (this.shouldIgnorePath(filepath)) {
                console.log(`Skipping ignored path: ${filepath}`);
                return;
            }

            const absolutePath = this.root.name + filepath.replace(this.rootPath, "");
            
            const breadcrumbs = absolutePath.split('/');
            let node = this.root;

            let temp = '/'

            for (let i = 0; i < breadcrumbs.length; i++) {
                const crumb = breadcrumbs[i];
                temp += crumb + '/';
                if (crumb === "") continue;
                
                // Skip dot directories like .git
                if (crumb.startsWith('.')) return;
                
                // Skip node_modules and other ignored directories
                if (this.ignoreDirs.includes(crumb)) {
                    console.log(`Skipping ignored directory: ${temp}`);
                    return;
                }
                
                if (!node.children.has(crumb)) {
                    if (i === breadcrumbs.length - 1) { // Last crumb
                        try {
                            const stats = fs.statSync(filepath);
                            if (stats.isFile()) {
                                if (stats.size > 1024 * 1024) { // Skip files larger than 1MB
                                    console.warn(`Skipping large file: ${filepath} (${stats.size} bytes)`);
                                    return;
                                }
                                console.log("Reading file", filepath);
                                const content = fs.readFileSync(filepath, 'utf-8').toString();
                                node.children.set(crumb, new Chunk(temp, crumb, content, false));
                                node = node.children.get(crumb)!;
                                await this.chunkifyCode(node, filepath, content);
                            } else {
                                // It's a directory - check if it's one we should skip
                                if (this.ignoreDirs.includes(crumb)) {
                                    console.log(`Skipping directory: ${temp}`);
                                    return;
                                }
                                node.children.set(crumb, new Chunk(temp, crumb, "", true));
                            }
                        } catch (error) {
                            console.error(`Error reading file ${filepath}:`, error);
                            return;
                        }
                    } else {
                        // Check if this is a directory we should skip
                        if (this.ignoreDirs.includes(crumb)) {
                            console.log(`Skipping directory: ${temp}`);
                            return;
                        }
                        node.children.set(crumb, new Chunk(temp, crumb, "", true));
                    }
                }
                node = node.children.get(crumb)!;
            }
            this.files.add(filepath);
        } catch (error) {
            console.error(`Error in addChunk for ${filepath}:`, error);
        }
    }

    async chunkifyCode(node: Chunk, filepath: string, content: string) {
        try {
            // Get the file extension to determine language
            let ext = filepath.split('.').pop()?.toLowerCase() || '';
            
            // Map some common extensions to their language parser
            const extensionMap: Record<string, string> = {
                'js': 'js',
                'jsx': 'jsx',
                'ts': 'ts',
                'tsx': 'tsx',
                'py': 'py',
                'java': 'java',
                'c': 'c',
                'cpp': 'cpp',
                'cc': 'cpp',
                'h': 'c',
                'hpp': 'cpp',
                'go': 'go',
                'rb': 'ruby',
                'php': 'php',
                'html': 'html',
                'htm': 'html',
                'css': 'css',
                'scss': 'css',
                'sass': 'css',
                'json': 'json',
                'yaml': 'yaml',
                'yml': 'yaml',
                'toml': 'toml',
                'sql': 'sql',
                'rs': 'rust',
                'swift': 'swift',
                'kt': 'kotlin',
                'kts': 'kotlin'
            };
            
            // Use mapped extension or fallback to original
            const parserExt = extensionMap[ext] || ext;
            
            const parser = await getParserForLanguage(parserExt);
            if (parser === null) {
                console.warn(`No parser available for file: ${filepath} (extension: ${ext})`);
                return;
            }
            
            const root = parser.parse(content).rootNode;
            this.extract(filepath, filepath, root, node);
        } catch (error) {
            console.error(`Error in chunkifyCode for ${filepath}:`, error);
        }
    }

    private extract(filepath: string, identifier: string, root: SyntaxNode, chunk: Chunk) {
        const ext = identifier.split('.').pop() || '';
        const config = LANGUAGE_CONFIGS[ext] || LANGUAGE_CONFIGS['py']; 

        const processNode = (node: SyntaxNode, parentIdentifier: string, isExported: boolean = false) => {
            // Helper function to create and add chunk
            const addNewChunk = (key: string, node: SyntaxNode) => {
                const child = new Chunk(filepath, key, node.text, false);
                chunk.children.set(key, child);
                this.files.add(key);
                return child;
            };

            // Handle declarations (class, function, method)
            if (config.classTypes.includes(node.type)) {
                const nameNode = node.namedChildren.find(n => config.identifierTypes.includes(n.type));
                if (nameNode) {
                    const key = parentIdentifier + ':' + nameNode.text;
                    addNewChunk(key, node);

                    // Process class body
                    const blockNode = node.namedChildren.find(n => config.blockTypes.includes(n.type));
                    if (blockNode) {
                        // Process class body contents
                        for (const childNode of blockNode.children) {
                            processNode(childNode, key);
                        }
                    }
                }
            } else if (config.functionTypes.includes(node.type) || config.methodTypes.includes(node.type)) {
                const nameNode = node.namedChildren.find(n => config.identifierTypes.includes(n.type));
                if (nameNode) {
                    const key = parentIdentifier + '::' + nameNode.text;
                    addNewChunk(key, node);
                }
            } else if (config.namespaceTypes.includes(node.type)) {
                // Process namespace contents
                for (const childNode of node.children) {
                    processNode(childNode, parentIdentifier);
                }
            } else if (node.type === 'export_statement' || node.type === 'export_declaration') {
                // Handle exports (common in TypeScript, JavaScript)
                const declaration = node.namedChildren[0];
                if (declaration) {
                    processNode(declaration, parentIdentifier, true);
                }
            } else {
                // Process other node types that might contain declarations
                if (node.namedChildCount > 0) {
                    for (const childNode of node.namedChildren) {
                        processNode(childNode, parentIdentifier);
                    }
                }
            }
        };

        // Process all children of the root node
        for (const node of root.children) {
            processNode(node, identifier);
        }
    }

    generateTree(): string {
        let result = this.rootPath + "\n";

        const dfs = (node: Chunk, result: string, prefix: string, isRoot: boolean = false) => {
            // Get sorted children for consistent display
            const sortedChildren = Array.from(node.children.values())
                .filter(child => !(child.isDirectory && this.ignoreDirs.includes(child.name)))
                .sort((a, b) => {
                    // Directories first, then files
                    if (a.isDirectory && !b.isDirectory) return -1;
                    if (!a.isDirectory && b.isDirectory) return 1;
                    return a.name.localeCompare(b.name);
                });
                
            for (const child of sortedChildren) {
                if (!isRoot) {
                    result += prefix + child.name + "\n";
                }
                result = dfs(child, result, prefix + "│   ", false);
            }
            return result;
        };

        return dfs(this.root, result, "", true);
    }

    // Utility to check if a path should be ignored
    shouldIgnorePath(filepath: string): boolean {
        // Check if path contains any ignored directory
        if (this.ignoreDirs.some(dir => 
            filepath.includes(`/${dir}/`) || 
            filepath.includes(`\\${dir}\\`) || 
            filepath.endsWith(`/${dir}`) || 
            filepath.endsWith(`\\${dir}`))) {
            return true;
        }
        
        // Check if file has binary extension
        if (this.binaryExtensions.some(ext => filepath.toLowerCase().endsWith(ext))) {
            return true;
        }
        
        return false;
    }
}

export async function indexCodebase() {
    const rootDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rootDir) {
        throw new Error("No directory specified");
    }

    console.log(`Starting indexing from root directory: ${rootDir}`);
    
    // Create the codebase instance
    const codebase = new Codebase(rootDir);
    
    // Get files with ignore paths from the codebase's configuration
    const files: string[] = getFiles(rootDir, codebase.ignoreDirs);
    console.log(`Found ${files.length} files to index (excluding node_modules and other ignored paths)`);
    
    const totalFiles = files.length;
    let processedFiles = 0;
    let skippedFiles = 0;

    console.log(`Starting to index ${totalFiles} files...`);

    for (const filepath of files) {
        // Double-check that we're not processing any ignored paths
        if (codebase.shouldIgnorePath(filepath)) {
            skippedFiles++;
            continue;
        }
        
        try {
            await codebase.addChunk(filepath);
            processedFiles++;
            
            // Log progress occasionally
            if (processedFiles % 100 === 0 || processedFiles === totalFiles) {
                console.log(`Indexed ${processedFiles}/${totalFiles} files (${skippedFiles} skipped)`);
            }
        } catch (error) {
            console.error(`Error indexing file ${filepath}:`, error);
            skippedFiles++;
        }
    }

    console.log(`Indexing complete: ${processedFiles} files indexed, ${skippedFiles} files skipped`);
    return codebase;
}