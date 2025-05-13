import path from 'path';
import Parser from 'web-tree-sitter';

const PARSER_CONFIGS = new Map<string, string>([
    ['py', 'tree-sitter-python.wasm'],
    ['js', 'tree-sitter-javascript.wasm'],
    ['ts', 'tree-sitter-typescript.wasm'],
    ['java', 'tree-sitter-java.wasm'],
    ['cpp', 'tree-sitter-cpp.wasm'],
    ['c', 'tree-sitter-c.wasm'],
    ['go', 'tree-sitter-go.wasm'],
    ['html', 'tree-sitter-html.wasm'],
    ['css', 'tree-sitter-css.wasm'],
    ['json', 'tree-sitter-json.wasm'],
    ['yaml', 'tree-sitter-yaml.wasm'],
    ['toml', 'tree-sitter-toml.wasm'],
    ['sql', 'tree-sitter-sql.wasm'],
]);

const parsers: Map<string, Parser> = new Map();

async function initParser(wasmPath: string): Promise<Parser> {
    await Parser.init();
    const Lang = await Parser.Language.load(wasmPath);
    const parser = new Parser();
    parser.setLanguage(Lang);

    return parser
}

async function getParserForLanguage(ext: string): Promise<Parser | null> {
    if (parsers.has(ext)) {
        return parsers.get(ext)!
    }

    const wasmName = PARSER_CONFIGS.get(ext);
    if (!wasmName) {
        return null;
    }
    
    const wasmPath = path.resolve(__dirname, '../../node_modules/tree-sitter-wasms/out', wasmName);
    const parser = await initParser(wasmPath);
    parsers.set(ext, parser);
    return parser;
}


export {getParserForLanguage}