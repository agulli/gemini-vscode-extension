// src/PromptTreeProvider.ts

import * as vscode from 'vscode';

// A simple interface to define our prompt's data structure
export interface Prompt {
    id: string;
    label: string; // The name of the prompt (e.g., "Explain Code")
    prompt: string; // The actual prompt text to be sent to Gemini
}

export class PromptTreeProvider implements vscode.TreeDataProvider<Prompt> {
    // This event emitter is used to tell VS Code to refresh the tree view
    private _onDidChangeTreeData: vscode.EventEmitter<Prompt | undefined | null | void> = new vscode.EventEmitter<Prompt | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Prompt | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Tells VS Code to refresh the data in the tree view.
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Gets the visual representation (the TreeItem) for a given prompt element.
     * @param element The data element (a Prompt).
     * @returns A VS Code TreeItem.
     */
    getTreeItem(element: Prompt): vscode.TreeItem {
        return {
            label: element.label,
            id: element.id,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            // This command will be executed when the user clicks on the item
            command: {
                command: 'gemini-code-buddy.runPrompt',
                title: 'Run Prompt on Code',
                arguments: [element]
            },
            tooltip: element.prompt // Show the full prompt on hover
        };
    }

    /**
     * Gets the children of a given element. Since our prompts are a flat list,
     * this will only be called once with no element to get the root items.
     * @param element The parent element (undefined for the root).
     * @returns A promise that resolves to an array of Prompts.
     */
    getChildren(element?: Prompt): Thenable<Prompt[]> {
        if (element) {
            // Our prompts have no children, so return an empty array if an element is provided
            return Promise.resolve([]);
        } else {
            // Get the saved prompts from VS Code's global storage
            const prompts = this.context.globalState.get<Prompt[]>('gemini-prompts', []);
            return Promise.resolve(prompts);
        }
    }

    // --- Command Implementations ---

    /**
     * Command to add a new prompt. It prompts the user for a label and the prompt text.
     */
    public async addPrompt() {
        const label = await vscode.window.showInputBox({ 
            prompt: 'Enter a short label for the prompt', 
            placeHolder: 'e.g., Explain This Code'
        });
        if (!label) return;

        const promptText = await vscode.window.showInputBox({ 
            prompt: 'Enter the full prompt text',
            placeHolder: 'e.g., Explain the following code snippet in simple terms.'
        });
        if (!promptText) return;

        // Retrieve the current list of prompts
        const prompts = this.context.globalState.get<Prompt[]>('gemini-prompts', []);
        
        // Create the new prompt object
        const newPrompt: Prompt = { id: Date.now().toString(), label, prompt: promptText };
        prompts.push(newPrompt);

        // Save the updated list back to global storage and refresh the view
        await this.context.globalState.update('gemini-prompts', prompts);
        this.refresh();
    }

    /**
     * Command to edit an existing prompt.
     * @param prompt The prompt item to edit, passed from the tree view context menu.
     */
    public async editPrompt(prompt: Prompt) {
        const newLabel = await vscode.window.showInputBox({ value: prompt.label, prompt: 'Edit the label' });
        if (newLabel === undefined) return;

        const newPromptText = await vscode.window.showInputBox({ value: prompt.prompt, prompt: 'Edit the prompt text' });
        if (newPromptText === undefined) return;

        const prompts = this.context.globalState.get<Prompt[]>('gemini-prompts', []);
        const index = prompts.findIndex(p => p.id === prompt.id);
        
        if (index > -1) {
            prompts[index] = { ...prompt, label: newLabel, prompt: newPromptText };
            await this.context.globalState.update('gemini-prompts', prompts);
            this.refresh();
        }
    }

    /**
     * Command to delete an existing prompt.
     * @param prompt The prompt item to delete, passed from the tree view context menu.
     */
    public async deletePrompt(prompt: Prompt) {
        const prompts = this.context.globalState.get<Prompt[]>('gemini-prompts', []);
        const updatedPrompts = prompts.filter(p => p.id !== prompt.id);
        
        await this.context.globalState.update('gemini-prompts', updatedPrompts);
        this.refresh();
    }
}