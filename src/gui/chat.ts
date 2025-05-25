import { models } from './models';

export function getChatContent() {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
		<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
		<style>
			body {
				padding: 0;
				margin: 0;
				font-family: var(--vscode-font-family);
				color: var(--vscode-foreground);
				height: 100vh;
				display: flex;
				flex-direction: column;
				background-color: var(--vscode-sideBar-background);
			}
			#chat-container {
				display: flex;
				flex-direction: column;
				height: 100vh;
				padding: 8px;
				box-sizing: border-box;
			}
			#messages {
				flex-grow: 1;
				overflow-y: auto;
				margin-bottom: 8px;
				padding-right: 4px;
			}
			.message {
				margin: 4px 0;
				padding: 6px;
				border-radius: 4px;
				max-width: 90%;
				font-size: 0.9em;
			}
			.user-message {
				background: var(--vscode-editor-inactiveSelectionBackground);
				margin-left: auto;
				color: #ffffff;
			}
			.bot-message {
				background: var(--vscode-sideBar-background);
				margin-right: auto;
				color: #ffffff;
			}
			.message-content {
				line-height: 1.4;
			}
			.message-content pre {
				background: var(--vscode-editor-background);
				padding: 6px;
				border-radius: 3px;
				overflow-x: auto;
				margin: 4px 0;
			}
			.message-content code {
				background: var(--vscode-editor-background);
				padding: 1px 3px;
				border-radius: 2px;
				font-family: var(--vscode-editor-font-family);
			}
			.message-content p {
				margin: 0 0 6px 0;
			}
			.message-content p:last-child {
				margin-bottom: 0;
			}
			.mermaid {
				background: var(--vscode-editor-background);
				padding: 10px;
				border-radius: 4px;
				text-align: center;
				margin: 8px 0;
			}
			.typing-indicator {
				display: inline-block;
				width: 6px;
				height: 6px;
				background-color: var(--vscode-foreground);
				border-radius: 50%;
				margin-left: 3px;
				animation: typing 1s infinite;
			}
			@keyframes typing {
				0% { opacity: 0.3; }
				50% { opacity: 1; }
				100% { opacity: 0.3; }
			}
			#input-container {
				display: flex;
				flex-direction: column;
				gap: 6px;
				padding: 8px;
				background: var(--vscode-sideBar-background);
				position: sticky;
				bottom: 0;
				border-top: 1px solid var(--vscode-editorGroup-border);
			}
			#message-input {
				flex-grow: 1;
				padding: 8px 10px;
				border: 1px solid var(--vscode-input-border);
				background: var(--vscode-input-background);
				color: var(--vscode-input-foreground);
				border-radius: 4px;
				outline: none;
				font-size: 0.9em;
				resize: none;
				font-family: var(--vscode-font-family);
				min-height: 40px;
			}
			#message-input:focus {
				border-color: var(--vscode-focusBorder);
			}
			#input-toolbar {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 8px;
			}
			.toolbar-item {
				padding: 0;
				background-color: var(--vscode-input-background);
				color: var(--vscode-input-foreground);
				border-radius: 4px;
				font-size: 0.85em;
				cursor: default;
			}
			.model-selector {
				margin-right: auto;
			}
			.model-selector select {
				background: var(--vscode-sideBar-background);
				color: var(--vscode-sideBar-foreground);
				border: 1px solid var(--vscode-editorGroup-border);
				border-radius: 4px;
				padding: 5px;
				font-size: 0.85em;
				cursor: pointer;
				outline: none;
			}
			.model-selector select:focus {
				border-color: var(--vscode-focusBorder);
			}
			.toolbar-button {
				padding: 6px;
				background: var(--vscode-sideBar-background);
				color: var(--vscode-sideBar-background);
				border: none;
				border-radius: 4px;
				cursor: pointer;
				font-size: 1.4em;
				line-height: 1;
			}
			#send-button.toolbar-button {
				font-size: 0.9em;
				padding: 6px 12px;
				background: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
			}
			#send-button.toolbar-button:hover {
				background: var(--vscode-button-hoverBackground);
			}
			button {
				padding: 6px 12px;
				background: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				border: none;
				border-radius: 4px;
				cursor: pointer;
				white-space: nowrap;
				transition: background-color 0.2s;
				font-size: 0.9em;
			}
			button:hover {
				background: var(--vscode-button-hoverBackground);
			}
			.config-notice {
				background: var(--vscode-editorInfo-background);
				border: 1px solid var(--vscode-editorInfo-border);
				border-radius: 4px;
				padding: 12px;
				margin: 8px;
				color: var(--vscode-editorInfo-foreground);
				font-size: 0.9em;
				line-height: 1.4;
			}
			.config-notice-title {
				font-weight: bold;
				margin-bottom: 8px;
				color: var(--vscode-foreground);
			}
			.config-notice-buttons {
				margin-top: 8px;
				display: flex;
				gap: 8px;
			}
			.config-button {
				padding: 4px 8px;
				background: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				border: none;
				border-radius: 3px;
				cursor: pointer;
				font-size: 0.85em;
			}
			.config-button:hover {
				background: var(--vscode-button-hoverBackground);
			}
		</style>
	</head>
	<body>
		<div id="chat-container">
			<div id="config-notice" class="config-notice" style="display: none;">
				<div class="config-notice-title">🔑 API Keys Required</div>
				<div>To start chatting, you need to configure API keys for your preferred AI providers:</div>
				<ul>
					<li><strong>OpenAI:</strong> For GPT models (gpt-4o, gpt-4.1)</li>
					<li><strong>Anthropic:</strong> For Claude models (claude-4-sonnet, claude-4-opus)</li>
					<li><strong>Google AI:</strong> For Gemini models (gemini-2.5-pro)</li>
				</ul>
				<div>Choose your preferred configuration method:</div>
				<div class="config-notice-buttons">
					<button class="config-button" onclick="openSettings()">VS Code Settings</button>
					<button class="config-button" onclick="createEnvTemplate()">Create .env File</button>
					<button class="config-button" onclick="dismissNotice()">Dismiss</button>
				</div>
			</div>
			<div id="messages"></div>
			<div id="input-container">
				<textarea id="message-input" placeholder="Plan, search, build anything" rows="2"></textarea>
				<div id="input-toolbar">
					<div class="toolbar-item model-selector">
						<select id="model-select">
							${models.map(model => `<option value="${model.value}">${model.label}</option>`).join('')}
						</select>
					</div>
					<button class="toolbar-button" id="send-button" onclick="sendMessage()" title="Send message">Send ⌘↩</button>
				</div>
			</div>
		</div>
		<script>
			const vscode = acquireVsCodeApi();
			const messagesContainer = document.getElementById('messages');
			const messageInput = document.getElementById('message-input');
			const modelSelect = document.getElementById('model-select');

			// Initialize Mermaid
			mermaid.initialize({
				startOnLoad: true,
				theme: 'dark',
				securityLevel: 'loose',
				logLevel: 'error'
			});

			// Configure marked options
			marked.setOptions({
				breaks: true,
				gfm: true
			});

			let currentBotMessage = null;
			let currentContent = '';

			function sendMessage() {
				const message = messageInput.value;
				const selectedModel = modelSelect.value;
				if (message) {
					addMessage(message, 'user');
					vscode.postMessage({
						command: 'sendMessage',
						text: message,
						model: selectedModel
					});
					messageInput.value = '';
				}
			}

			function addMessage(text, sender) {
				const messageDiv = document.createElement('div');
				messageDiv.className = 'message ' + sender + '-message';
				
				const contentDiv = document.createElement('div');
				contentDiv.className = 'message-content';
				contentDiv.innerHTML = marked.parse(text);
				
				messageDiv.appendChild(contentDiv);
				messagesContainer.appendChild(messageDiv);
				messagesContainer.scrollTop = messagesContainer.scrollHeight;

				if (sender === 'bot') {
					currentBotMessage = messageDiv;
					currentContent = text;
					renderMermaidDiagrams(messageDiv);
				}
			}

			function addResponseChunk(chunk) {
				if (!currentBotMessage) {
					currentBotMessage = document.createElement('div');
					currentBotMessage.className = 'message bot-message';
					
					const contentDiv = document.createElement('div');
					contentDiv.className = 'message-content';
					currentBotMessage.appendChild(contentDiv);
					
					messagesContainer.appendChild(currentBotMessage);
				}

				currentContent += chunk;
				const contentDiv = currentBotMessage.querySelector('.message-content');
				contentDiv.innerHTML = marked.parse(currentContent);
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}

			function renderMermaidDiagrams(messageElement) {
				// Find all pre code blocks with mermaid language
				const mermaidCodeBlocks = messageElement.querySelectorAll('pre code.language-mermaid');
				
				mermaidCodeBlocks.forEach((codeBlock, index) => {
					const mermaidCode = codeBlock.textContent;
					const parentPre = codeBlock.parentElement;
					
					// Create a div for mermaid to render into
					const mermaidDiv = document.createElement('div');
					mermaidDiv.className = 'mermaid';
					mermaidDiv.id = 'mermaid-diagram-' + Date.now() + '-' + index;
					mermaidDiv.textContent = mermaidCode;
					
					// Replace the pre element with our mermaid div
					parentPre.parentNode.replaceChild(mermaidDiv, parentPre);
					
					// Render the diagram
					setTimeout(() => {
						mermaid.init(undefined, mermaidDiv);
					}, 0);
				});
			}

			// Handle messages from the extension
			window.addEventListener('message', event => {
				const message = event.data;
				switch (message.command) {
					case 'addResponseChunk':
						addResponseChunk(message.text);
						break;
					case 'responseComplete':
						if (currentBotMessage) {
							renderMermaidDiagrams(currentBotMessage);
						}
						currentBotMessage = null;
						currentContent = '';
						break;
					case 'showConfigNotice':
						document.getElementById('config-notice').style.display = 'block';
						break;
					case 'hideConfigNotice':
						document.getElementById('config-notice').style.display = 'none';
						break;
				}
			});

			// Allow sending message with Enter key (Shift+Enter for new line in textarea)
			messageInput.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
					e.preventDefault(); // Prevent new line or other default browser actions
					sendMessage();
				}
			});

			// Handle model selection changes
			modelSelect.addEventListener('change', (e) => {
				vscode.postMessage({
					command: 'modelChanged',
					model: e.target.value
				});
			});

			// Focus the input when the webview is loaded
			messageInput.focus();

			function openSettings() {
				vscode.postMessage({
					command: 'openSettings'
				});
			}

			function createEnvTemplate() {
				vscode.postMessage({
					command: 'createEnvTemplate'
				});
			}

			function dismissNotice() {
				document.getElementById('config-notice').style.display = 'none';
			}

			function checkApiKeysConfiguration() {
				vscode.postMessage({
					command: 'checkApiKeys'
				});
			}

			// Check API keys on load
			checkApiKeysConfiguration();
		</script>
	</body>
	</html>`;
}