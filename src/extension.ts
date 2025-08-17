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

    context.subscriptions.push(vscode.commands.registerCommand('gemini-code-buddy.start', () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage("Please open a code file before starting Gemini Code Buddy.");
            return;
        }
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

    // Register the new export command
    context.subscriptions.push(vscode.commands.registerCommand('gemini-code-buddy.exportPrompts', () => {
        promptTreeProvider.exportPrompts();
    }));

    // Register the new import command
    context.subscriptions.push(vscode.commands.registerCommand('gemini-code-buddy.importPrompts', () => {
        promptTreeProvider.importPrompts();
    }));
    
    context.subscriptions.push(vscode.commands.registerCommand('gemini-code-buddy.runPrompt', (prompt: Prompt) => {
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