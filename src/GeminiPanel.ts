// src/GeminiPanel.ts

import * as vscode from 'vscode';
import { getGeminiResponse } from './geminiService';
import { applyCodeModification } from './vscodeUtils';

export class GeminiPanel {
    public static currentPanel: GeminiPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _editor: vscode.TextEditor;

    public static readonly viewType = 'geminiPanel';

    public static createOrShow(extensionUri: vscode.Uri, editor: vscode.TextEditor) {
        const column = vscode.ViewColumn.Two;

        if (GeminiPanel.currentPanel) {
            GeminiPanel.currentPanel._panel.reveal(column);
            GeminiPanel.currentPanel._editor = editor;
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            GeminiPanel.viewType,
            'Gemini Code Buddy',
            column,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        GeminiPanel.currentPanel = new GeminiPanel(panel, extensionUri, editor);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, editor: vscode.TextEditor) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._editor = editor;

        this._panel.webview.html = this._getHtmlForWebview();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'submitPrompt':
                        const isSelection = !this._editor.selection.isEmpty;
                        const codeContext = this._editor.document.getText(isSelection ? this._editor.selection : undefined);

                        if (!codeContext) {
                            vscode.window.showErrorMessage('No code found in the editor to provide context.');
                            return;
                        }

                        this._panel.webview.postMessage({ command: 'showLoading' });

                        const fullPrompt = `
                            Based on the following code context, please handle this request: "${message.prompt}"
                            
                            --- CODE CONTEXT ---
                            ${codeContext}
                            --- END CODE CONTEXT ---

                            IMPORTANT: Your response MUST be formatted using standard Markdown.
                            - Use lists for steps or bullet points.
                            - Use **bold** for emphasis.
                            - Use inline \`code\` for variable names or short snippets.
                        `;

                        try {
                            const response = await getGeminiResponse(fullPrompt);
                            this._panel.webview.postMessage({ command: 'addResponse', response: response });
                        } catch (error) {
                            vscode.window.showErrorMessage(`Error communicating with Gemini: ${error}`);
                            this._panel.webview.postMessage({ command: 'addResponse', response: 'Sorry, an error occurred.' });
                        }
                        return;

                    case 'applyCode':
                        applyCodeModification(this._editor, message.code);
                        return;
                }
            },
            null,
            this._disposables
        );
    }
    
    public handlePromptFromLibrary(promptText: string) {
        this._panel.webview.postMessage({
            command: 'executePrompt',
            prompt: promptText
        });
    }

    public dispose() {
        GeminiPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview() {
        function getNonce() {
            let text = '';
            const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            for (let i = 0; i < 32; i++) {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return text;
        }
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                <title>Gemini Code Buddy</title>
                <style>
                    body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); }
                    #chat-container { display: flex; flex-direction: column; height: 100vh; padding: 10px; box-sizing: border-box; }
                    #messages { flex-grow: 1; overflow-y: auto; border: 1px solid var(--vscode-side-bar-border, #333); border-radius: 4px; margin-bottom: 10px; padding: 5px; }
                    #prompt-input { width: 100%; padding: 8px; border: 1px solid var(--vscode-input-border, #333); background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 4px; }
                    .message { padding: 5px 0; word-wrap: break-word; }
                    .user-message { font-weight: bold; }
                    .gemini-message b { color: var(--vscode-terminal-ansi-bright-blue); }
                    
                    /* Styles for rendered Markdown */
                    .gemini-message ul, .gemini-message ol { padding-left: 20px; }
                    .gemini-message li { margin-bottom: 5px; }
                    .gemini-message code { background-color: var(--vscode-text-block-quote-background); padding: 1px 3px; border-radius: 3px; font-family: var(--vscode-editor-font-family); }
                    .gemini-message p { margin-top: 0; margin-bottom: 0.5em; }
                </style>
            </head>
            <body>
                <div id="chat-container">
                    <div id="messages">
                        <div class="gemini-message"><b>Gemini:</b> Hello! Open a code file and ask me a question about it.</div>
                    </div>
                    <div id="prompt-container">
                        <input type="text" id="prompt-input" placeholder="e.g., 'refactor this function'"/>
                    </div>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const messagesDiv = document.getElementById('messages');
                    const promptInput = document.getElementById('prompt-input');

                    function submitPrompt() {
                        const prompt = promptInput.value;
                        if (prompt) {
                            messagesDiv.innerHTML += '<div class="message user-message"><b>You:</b> ' + escapeHtml(prompt) + '</div>';
                            vscode.postMessage({ command: 'submitPrompt', prompt: prompt });
                            promptInput.value = '';
                            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                        }
                    }

                    promptInput.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter') {
                            submitPrompt();
                        }
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'addResponse':
                                const responseText = message.response;
                                const htmlResponse = marked.parse(responseText);
                                messagesDiv.innerHTML += '<div class="message gemini-message"><b>Gemini:</b> ' + htmlResponse + '</div>';
                                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                                break;
                            case 'showLoading':
                                messagesDiv.innerHTML += '<div class="message gemini-message"><b>Gemini:</b> Thinking...</div>';
                                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                                break;
                            case 'executePrompt':
                                promptInput.value = message.prompt;
                                submitPrompt();
                                break;
                        }
                    });

                    function escapeHtml(str) {
                        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                    }
                </script>
            </body>
            </html>`;
    }
}