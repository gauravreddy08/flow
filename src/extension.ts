// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getWebviewContent } from './gui/webview';
import { processMessage } from "./core/core";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Create status bar item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = "$(chat) Flow Chat";
	statusBarItem.tooltip = "Open Flow Chat";
	statusBarItem.command = 'flow.startChat';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Create and register the chat view provider
	const chatViewProvider = new ChatViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('flow.chatView', chatViewProvider)
	);

	// Register the command
	let disposable = vscode.commands.registerCommand('flow.startChat', () => {
		vscode.commands.executeCommand('flow.chatView.focus');
	});

	context.subscriptions.push(disposable);
}

class ChatViewProvider implements vscode.WebviewViewProvider {
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

		webviewView.webview.html = getWebviewContent();

		// Handle messages from the webview
		this._disposables.push(
			webviewView.webview.onDidReceiveMessage(
				message => {
					switch (message.command) {
						case 'sendMessage':
							// Process the message and stream the response
							processMessage(message.text, (chunk) => {
								webviewView.webview.postMessage({
									command: 'addResponseChunk',
									text: chunk
								});
							}).then(response => {
								webviewView.webview.postMessage({
									command: 'responseComplete'
								});
							});
							return;
					}
				}
			)
		);
	}

	dispose() {
		this._disposables.forEach(d => d.dispose());
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
