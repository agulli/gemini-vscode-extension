// src/geminiService.ts

import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Sends a prompt to the Gemini API and returns the complete response.
 * @param prompt The full prompt string to send to the model.
 * @returns A promise that resolves to the full text response from Gemini.
 */
export async function getGeminiResponse(prompt: string): Promise<string> {
    const apiKey = vscode.workspace.getConfiguration('gemini-code-buddy').get<string>('apiKey');

    if (!apiKey) {
        vscode.window.showErrorMessage('Gemini API key not found. Please set it in the VS Code settings.');
        throw new Error('API key not configured.');
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Use generateContent for a single, non-streaming response
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        return response.text();

    } catch (error) {
        console.error("Gemini API Error:", error);
        vscode.window.showErrorMessage(`Failed to get response from Gemini. Check the developer console for more details.`);
        throw new Error('Failed to get response from Gemini.');
    }
}