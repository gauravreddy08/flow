export function getWebviewContent() {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
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
				gap: 6px;
				padding: 6px 0;
				background: var(--vscode-sideBar-background);
				position: sticky;
				bottom: 0;
			}
			#message-input {
				flex-grow: 1;
				padding: 6px 10px;
				border: 1px solid var(--vscode-input-border);
				background: var(--vscode-input-background);
				color: var(--vscode-input-foreground);
				border-radius: 4px;
				outline: none;
				font-size: 0.9em;
			}
			#message-input:focus {
				border-color: var(--vscode-focusBorder);
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
		</style>
	</head>
	<body>
		<div id="chat-container">
			<div id="messages"></div>
			<div id="input-container">
				<input type="text" id="message-input" placeholder="Type your message...">
				<button onclick="sendMessage()">Send</button>
			</div>
		</div>
		<script>
			const vscode = acquireVsCodeApi();
			const messagesContainer = document.getElementById('messages');
			const messageInput = document.getElementById('message-input');

			// Configure marked options
			marked.setOptions({
				breaks: true,
				gfm: true
			});

			let currentBotMessage = null;
			let currentContent = '';

			function sendMessage() {
				const message = messageInput.value;
				if (message) {
					addMessage(message, 'user');
					vscode.postMessage({
						command: 'sendMessage',
						text: message
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

			// Handle messages from the extension
			window.addEventListener('message', event => {
				const message = event.data;
				switch (message.command) {
					case 'addResponseChunk':
						addResponseChunk(message.text);
						break;
					case 'responseComplete':
						currentBotMessage = null;
						currentContent = '';
						break;
				}
			});

			// Allow sending message with Enter key
			messageInput.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') {
					sendMessage();
				}
			});

			// Focus the input when the webview is loaded
			messageInput.focus();
		</script>
	</body>
	</html>`