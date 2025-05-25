import * as vscode from 'vscode';
import { getChatContent } from './chat';
import { processMessage } from '../core/core';
import { invalidateRegistry } from '../core/utils/utils';

export class ChatViewProvider implements vscode.WebviewViewProvider {
	private _disposables: vscode.Disposable[] = [];

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = getChatContent();
		
		// Listen for configuration changes
		this._disposables.push(
			vscode.workspace.onDidChangeConfiguration(e => {
				if (e.affectsConfiguration('flow.apiKeys')) {
					console.log('[DEBUG] Flow API keys configuration changed, invalidating registry');
					invalidateRegistry();
					// Re-check API keys after configuration change
					setTimeout(() => {
						this.checkApiKeysConfiguration(webviewView);
					}, 100);
				}
			})
		);

		// Handle messages from the webview
		this._disposables.push(
			webviewView.webview.onDidReceiveMessage(
				message => {
					switch (message.command) {
						case 'sendMessage':							
							processMessage(message.text, message.model, (chunk) => {
								webviewView.webview.postMessage({
									command: 'addResponseChunk',
									text: chunk
								});
							}).then(response => {
								webviewView.webview.postMessage({
									command: 'responseComplete'
								});
							}).catch(error => {
								console.error('[ERROR] Process message failed:', error);
								webviewView.webview.postMessage({
									command: 'addResponseChunk',
									text: `\n\n**Error:** ${error.message}\n\nPlease check your API key configuration and try again.`
								});
								webviewView.webview.postMessage({
									command: 'responseComplete'
								});
							});
							return;
						case 'openSettings':
							vscode.commands.executeCommand('flow.openSettings');
							return;
						case 'createEnvTemplate':
							vscode.commands.executeCommand('flow.createEnvTemplate');
							return;
						case 'checkApiKeys':
							this.checkApiKeysConfiguration(webviewView);
							return;
					}
				}
			)
		);
	}

	private checkApiKeysConfiguration(webviewView: vscode.WebviewView) {
		const config = vscode.workspace.getConfiguration('flow');
		const openaiKey = config.get<string>('apiKeys.openai');
		const anthropicKey = config.get<string>('apiKeys.anthropic');
		const googleKey = config.get<string>('apiKeys.google');

		// Check if at least one API key is configured
		const hasAnyKey = (openaiKey && openaiKey.trim()) || 
						  (anthropicKey && anthropicKey.trim()) || 
						  (googleKey && googleKey.trim());

		if (!hasAnyKey) {
			// Also check environment variables as fallback
			const hasEnvKeys = process.env.OPENAI_API_KEY || 
							   process.env.OPENAI_BYOK_API_KEY || 
							   process.env.ANTHROPIC_API_KEY || 
							   process.env.ANTHROPIC_BYOK_API_KEY || 
							   process.env.GOOGLE_GENERATIVE_AI_API_KEY || 
							   process.env.GOOGLE_API_KEY;

			if (!hasEnvKeys) {
				webviewView.webview.postMessage({
					command: 'showConfigNotice'
				});
			} else {
				webviewView.webview.postMessage({
					command: 'hideConfigNotice'
				});
			}
		} else {
			webviewView.webview.postMessage({
				command: 'hideConfigNotice'
			});
		}
	}

	dispose() {
		this._disposables.forEach(d => d.dispose());
	}
}