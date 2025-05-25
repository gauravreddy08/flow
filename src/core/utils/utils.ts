import fs from 'fs';
import path from 'path';

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createProviderRegistry } from 'ai';

import dotenv from 'dotenv';
dotenv.config();

import * as vscode from 'vscode';

// Function to get API keys from VS Code configuration or fallback to environment variables
function getApiKey(provider: 'openai' | 'anthropic' | 'google'): string | undefined {
    try {
        const config = vscode.workspace.getConfiguration('flow');
        const configKey = config.get<string>(`apiKeys.${provider}`);
        
        console.log(`[DEBUG] Getting API key for ${provider}:`);
        console.log(`[DEBUG] Config key: ${configKey ? '***exists***' : 'undefined'}`);
        
        if (configKey && configKey.trim()) {
            console.log(`[DEBUG] Using VS Code config for ${provider}`);
            return configKey.trim();
        }
    } catch (error) {
        console.log(`[DEBUG] Error getting VS Code config for ${provider}:`, error);
    }
    
    // Fallback to environment variables
    let envKey: string | undefined;
    switch (provider) {
        case 'openai':
            envKey = process.env.OPENAI_BYOK_API_KEY || process.env.OPENAI_API_KEY;
            break;
        case 'anthropic':
            envKey = process.env.ANTHROPIC_BYOK_API_KEY || process.env.ANTHROPIC_API_KEY;
            break;
        case 'google':
            envKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
            break;
        default:
            envKey = undefined;
    }
    
    console.log(`[DEBUG] Env key for ${provider}: ${envKey ? '***exists***' : 'undefined'}`);
    return envKey;
}

export function pushNotification(message: string) {
    vscode.window.showInformationMessage(message);
}

// Create registry dynamically to ensure VS Code configuration is available
let _registry: any = null;

export function getRegistry() {
    if (!_registry) {
        console.log('[DEBUG] Creating provider registry...');
        
        const openaiKey = getApiKey('openai');
        const anthropicKey = getApiKey('anthropic');
        const googleKey = getApiKey('google');
        
        console.log('[DEBUG] API keys status:', {
            openai: openaiKey ? '***configured***' : 'missing',
            anthropic: anthropicKey ? '***configured***' : 'missing',
            google: googleKey ? '***configured***' : 'missing'
        });
        
        const providers: any = {};
        
        // Only create providers if API keys are available
        if (openaiKey) {
            try {
                providers.openai = createOpenAI({
                    apiKey: openaiKey,
                });
                console.log('[DEBUG] OpenAI provider created successfully');
            } catch (error) {
                console.error('[ERROR] Failed to create OpenAI provider:', error);
            }
        } else {
            console.log('[DEBUG] Skipping OpenAI provider - no API key');
        }
        
        if (anthropicKey) {
            try {
                providers.anthropic = createAnthropic({
                    apiKey: anthropicKey,
                });
                console.log('[DEBUG] Anthropic provider created successfully');
            } catch (error) {
                console.error('[ERROR] Failed to create Anthropic provider:', error);
            }
        } else {
            console.log('[DEBUG] Skipping Anthropic provider - no API key');
        }
        
        if (googleKey) {
            try {
                providers.google = createGoogleGenerativeAI({
                    apiKey: googleKey,
                });
                console.log('[DEBUG] Google provider created successfully');
            } catch (error) {
                console.error('[ERROR] Failed to create Google provider:', error);
            }
        } else {
            console.log('[DEBUG] Skipping Google provider - no API key');
        }
        
        _registry = createProviderRegistry(providers);
        
        console.log('[DEBUG] Provider registry created with providers:', Object.keys(providers));
    }
    return _registry;
}

// For backward compatibility
export const registry = {
    languageModel: (provider: string) => {
        return getRegistry().languageModel(provider);
    }
};

// Function to invalidate the registry cache (useful when settings change)
export function invalidateRegistry() {
    console.log('[DEBUG] Invalidating provider registry cache');
    _registry = null;
}

export function getFiles(rootDir: string, ignorePaths: string[] = []) : string[] {
    let results: string[] = [];
    
    // Default paths to ignore if not specified
    const defaultIgnorePaths = [
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
    
    // Combine default ignore paths with user-provided ones
    const pathsToIgnore = [...new Set([...defaultIgnorePaths, ...ignorePaths])];

    try {
        const files = fs.readdirSync(rootDir);
        if(files.length === 0) {
            results.push(rootDir);
            return results;
        }

        for (const file of files) {
            // Skip ignored directories and files
            if (pathsToIgnore.some(ignorePath => file === ignorePath || file.startsWith(ignorePath + '/'))) {
                continue;
            }
            
            const filePath = path.join(rootDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                results = results.concat(getFiles(filePath, pathsToIgnore));
            } else {
                results.push(filePath);
            }
        }
        return results;
    }
    catch (error) {
        console.error(`Error reading directory ${rootDir}:`, error);
        return results; // Return empty results instead of throwing
    }
}

export function write_file(filepath: string, content: string) {
    const absolutePath = path.resolve(filepath);
    const dirname = path.dirname(absolutePath);

    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
    }

    fs.writeFileSync(absolutePath, content);
}
