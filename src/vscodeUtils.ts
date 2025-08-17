// src/vscodeUtils.ts

import * as vscode from 'vscode';

/**
 * Gets the content of the currently active text editor.
 * It prioritizes the user's selected text. If no text is selected,
 * it returns the content of the entire file.
 * @returns An object containing the content and a boolean indicating if it was a selection, or undefined if no editor is open.
 */
export function getActiveEditorContent(): { content: string; isSelection: boolean } | undefined {
    // If the webview is active, activeTextEditor can be undefined.
    // This is a fallback to check for any visible text editors if there's no "active" one.
    const editor = vscode.window.activeTextEditor || vscode.window.visibleTextEditors[0];
    
    if (!editor) {
        return undefined;
    }

    const selection = editor.selection;
    const isSelection = !selection.isEmpty;
    
    const content = isSelection ? editor.document.getText(selection) : editor.document.getText();
    
    return { content, isSelection };
}

/**
 * Applies a code modification to the active editor using a WorkspaceEdit.
 * @param editor The active VS Code text editor.
 * @param newCode The new code string to apply.
 */
export async function applyCodeModification(editor: vscode.TextEditor, newCode: string) {
    const selection = editor.selection;
    const isSelection = !selection.isEmpty;

    const range = isSelection ? selection : new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length)
    );

    const edit = new vscode.WorkspaceEdit();
    edit.replace(editor.document.uri, range, newCode);
    
    await vscode.workspace.applyEdit(edit);
    vscode.window.showInformationMessage('Gemini applied the code changes!');
}