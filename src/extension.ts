// src/extension.ts

import * as vscode from 'vscode';
import { GeminiPanel } from './GeminiPanel';
import { PromptTreeProvider, Prompt } from './PromptTreeProvider';

/**
 * This method is called when your extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "gemini-code-buddy" is now active!');

    const promptTreeProvider = new PromptTreeProvider(context);
    vscode.window.registerTreeDataProvider('gemini-prompt-library', promptTreeProvider);

    // MODIFIED: This command now finds the active editor before creating the panel.
    context.subscriptions.push(vscode.commands.registerCommand('gemini-code-buddy.start', () => {
        // First, ensure there is an active text editor
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage("Please open a code file before starting Gemini Code Buddy.");
            return;
        }
        // Then, pass that editor reference when creating the panel
        GeminiPanel.createOrShow(context.extensionUri, activeEditor);
    }));

    // --- Register all commands for managing the prompt library ---

    context.subscriptions.push(vscode.commands.registerCommand('gemini-code-buddy.addPrompt', () => {
        promptTreeProvider.addPrompt();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('gemini-code-buddy.editPrompt', (prompt: Prompt) => {
        promptTreeProvider.editPrompt(prompt);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('gemini-code-buddy.deletePrompt', (prompt: Prompt) => {
        promptTreeProvider.deletePrompt(prompt);
    }));
    
    context.subscriptions.push(vscode.commands.registerCommand('gemini-code-buddy.runPrompt', (prompt: Prompt) => {
        // Ensure there is an active editor before running a prompt from the sidebar
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage("Please open a code file to run a prompt on.");
            return;
        }

        GeminiPanel.createOrShow(context.extensionUri, activeEditor);
        
        setTimeout(() => {
            if (GeminiPanel.currentPanel) {
                GeminiPanel.currentPanel.handlePromptFromLibrary(prompt.prompt);
            }
        }, 500);
    }));
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate() {}