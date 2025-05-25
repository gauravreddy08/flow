# Flow - AI Chat Interface for VS Code

A powerful chat interface for VS Code that integrates with multiple AI providers including OpenAI, Anthropic, and Google AI.

## Features

- 🤖 Support for multiple AI models:
  - **OpenAI**: GPT-4o, GPT-4.1
  - **Anthropic**: Claude-4-Sonnet, Claude-4-Opus  
  - **Google AI**: Gemini-2.5-Pro
- 💬 Interactive chat interface in VS Code sidebar
- 🔧 Easy API key configuration
- ⌨️ Keyboard shortcuts for quick access

## Setup

### API Key Configuration

You can configure your API keys in two ways:

#### Option 1: VS Code Settings (Recommended)
1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run "Configure Flow API Keys" or use the shortcut `Ctrl+Shift+K` / `Cmd+Shift+K`
3. Add your API keys in the Flow settings section:
   - `flow.apiKeys.openai`: Your OpenAI API key
   - `flow.apiKeys.anthropic`: Your Anthropic API key  
   - `flow.apiKeys.google`: Your Google AI API key

**🔐 Security Note**: API key fields are password-protected (masked input) and stored securely in your user settings.

#### Option 2: Environment Variables
1. Create a `.env` file in your workspace root
2. Add your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
   ```
3. Restart VS Code

You can also use the "Create .env Template for Flow" command to generate a template file.

### Getting API Keys

- **OpenAI**: Get your API key from [OpenAI API Keys](https://platform.openai.com/api-keys)
- **Anthropic**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
- **Google AI**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Usage

1. Open the Flow Chat panel from the Activity Bar or use `Ctrl+Shift+C` / `Cmd+Shift+C`
2. Select your preferred AI model from the dropdown
3. Start chatting!

## Commands

- `Flow: Start Flow Chat` - Open the chat interface
- `Flow: Configure Flow API Keys` - Open API key settings
- `Flow: Create .env Template for Flow` - Create a template .env file

## Keyboard Shortcuts

- `Ctrl+Shift+C` / `Cmd+Shift+C` - Start Flow Chat
- `Ctrl+Shift+K` / `Cmd+Shift+K` - Configure API Keys
- `Ctrl+Enter` / `Cmd+Enter` - Send message (in chat)

## Troubleshooting

If you're experiencing issues with specific AI providers:

1. **Check API Keys**: Ensure your API keys are properly configured in VS Code settings or environment variables
2. **Check Console Logs**: Open the VS Code Developer Console (`Help > Toggle Developer Tools`) to see detailed debug information
3. **Verify API Keys**: Ensure your API keys are valid and have the necessary permissions
4. **Restart VS Code**: After changing environment variables, restart VS Code completely

### Common Issues

- **Only OpenAI works**: Make sure Anthropic and Google AI keys are properly set in either VS Code settings or environment variables
- **"Missing API key" errors**: Verify your configuration in VS Code settings
- **Environment variables not loading**: Restart VS Code after creating/modifying `.env` files

# Introducing Flow

https://github.com/user-attachments/assets/369c2377-bf68-4204-b0cc-5e07710fd192

**Flow** is a lightweight clone of agentic IDEs like Cursor and Windsurf. Built as a VSCode extension, this project helped me dive deep into understanding the inner workings of AI-powered development environments.

Through building **Flow**, I gained hands-on experience with the architecture and mechanisms that power modern intelligent IDEs.

To see the cool demo, check it out on [**YouTube**](https://www.youtube.com/watch?v=ij5LJVJD6ac)

> ###### More Similar Projects on [**gauravreddy08.github.io**](https://gauravreddy08.github.io/)
