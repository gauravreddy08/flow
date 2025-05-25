// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ChatViewProvider } from './gui/ChatView';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Flow extension is activating');

	// Create status bar item for chat
	const chatStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	chatStatusBarItem.text = "$(chat) Flow Chat";
	chatStatusBarItem.tooltip = "Open Flow Chat";
	chatStatusBarItem.command = 'flow.startChat';
	chatStatusBarItem.show();
	context.subscriptions.push(chatStatusBarItem);

	// Create and register the chat view provider
	const chatViewProvider = new ChatViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('flow.chatView', chatViewProvider)
	);

	// Register the chat command
	let disposableChat = vscode.commands.registerCommand('flow.startChat', () => {
		console.log('Starting chat view');
		Promise.resolve(vscode.commands.executeCommand('flow.chatView.focus'))
			.then(() => console.log('Chat view focused'))
			.catch((err) => console.error('Error focusing chat view:', err));
	});
	context.subscriptions.push(disposableChat);

	// Register the settings command
	let disposableSettings = vscode.commands.registerCommand('flow.openSettings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', 'flow.apiKeys');
	});
	context.subscriptions.push(disposableSettings);

	// Register command to create .env template
	let disposableEnvTemplate = vscode.commands.registerCommand('flow.createEnvTemplate', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace folder is open');
			return;
		}

		const envPath = path.join(workspaceFolders[0].uri.fsPath, '.env');
		const envTemplate = `# Flow API Keys Configuration
# Uncomment and add your API keys below:

# OpenAI API Key (for GPT models)
# OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Key (for Claude models)  
# ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google AI API Key (for Gemini models)
# GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
`;

		try {
			if (fs.existsSync(envPath)) {
				const choice = await vscode.window.showWarningMessage(
					'.env file already exists. Do you want to overwrite it?',
					'Yes', 'No'
				);
				if (choice !== 'Yes') {
					return;
				}
			}
			
			fs.writeFileSync(envPath, envTemplate);
			vscode.window.showInformationMessage('.env template created! Add your API keys and restart VS Code.');
			
			// Open the .env file
			const document = await vscode.workspace.openTextDocument(envPath);
			vscode.window.showTextDocument(document);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to create .env file: ${error}`);
		}
	});
	context.subscriptions.push(disposableEnvTemplate);
}

// This method is called when your extension is deactivated
export function deactivate() {}
