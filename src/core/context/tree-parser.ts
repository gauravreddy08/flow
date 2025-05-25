import path from 'path';
import Parser from 'web-tree-sitter';
import * as fs from 'fs';

const PARSER_CONFIGS = new Map<string, string>([
    ['py', 'tree-sitter-python.wasm'],
    ['js', 'tree-sitter-javascript.wasm'],
    ['jsx', 'tree-sitter-javascript.wasm'],
    ['ts', 'tree-sitter-typescript.wasm'],
    ['tsx', 'tree-sitter-tsx.wasm'],
    ['java', 'tree-sitter-java.wasm'],
    ['cpp', 'tree-sitter-cpp.wasm'],
    ['c', 'tree-sitter-c.wasm'],
    ['go', 'tree-sitter-go.wasm'],
    ['ruby', 'tree-sitter-ruby.wasm'],
    ['php', 'tree-sitter-php.wasm'],
    ['html', 'tree-sitter-html.wasm'],
    ['css', 'tree-sitter-css.wasm'],
    ['json', 'tree-sitter-json.wasm'],
    ['yaml', 'tree-sitter-yaml.wasm'],
    ['yml', 'tree-sitter-yaml.wasm'],
    ['toml', 'tree-sitter-toml.wasm'],
    ['sql', 'tree-sitter-sql.wasm'],
    ['rust', 'tree-sitter-rust.wasm'],
    ['rs', 'tree-sitter-rust.wasm'],
    ['swift', 'tree-sitter-swift.wasm'],
    ['kt', 'tree-sitter-kotlin.wasm'],
    ['kotlin', 'tree-sitter-kotlin.wasm'],
]);

const parsers: Map<string, Parser> = new Map();
let parserInitialized = false;

async function initParser(wasmPath: string): Promise<Parser | null> {
    try {
        // Check if file exists first to avoid cryptic errors
        if (!fs.existsSync(wasmPath)) {
            console.error(`WASM file not found: ${wasmPath}`);
            return null;
        }
        
        if (!parserInitialized) {
            await Parser.init();
            parserInitialized = true;
        }
        
        const Lang = await Parser.Language.load(wasmPath);
        const parser = new Parser();
        parser.setLanguage(Lang);

        return parser;
    } catch (error) {
        console.error(`Error initializing parser from ${wasmPath}:`, error);
        return null;
    }
}

async function getParserForLanguage(ext: string): Promise<Parser | null> {
    try {
        // Normalize extension (remove dot if present)
        const normalizedExt = ext.startsWith('.') ? ext.slice(1) : ext;
        
        if (parsers.has(normalizedExt)) {
            return parsers.get(normalizedExt)!;
        }

        const wasmName = PARSER_CONFIGS.get(normalizedExt);
        if (!wasmName) {
            console.warn(`No parser configuration found for extension: ${normalizedExt}`);
            return null;
        }
        
        // Try to find the WASM file in different possible locations
        const possibleLocations = [
            path.resolve(__dirname, '../../node_modules/tree-sitter-wasms/out', wasmName),
            path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out', wasmName),
            path.resolve(__dirname, 'node_modules/tree-sitter-wasms/out', wasmName)
        ];
        
        let parser = null;
        for (const wasmPath of possibleLocations) {
            console.log(`Trying to load parser from ${wasmPath}`);
            parser = await initParser(wasmPath);
            if (parser) {
                parsers.set(normalizedExt, parser);
                return parser;
            }
        }
        
        console.error(`Failed to load parser for extension ${normalizedExt} from any location`);
        return null;
    } catch (error) {
        console.error(`Error in getParserForLanguage for ${ext}:`, error);
        return null;
    }
}

export {getParserForLanguage}