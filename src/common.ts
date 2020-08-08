import * as vscode from "vscode"

const fs = vscode.workspace.fs

export const concat = (x: any[], y: any[]) => x.concat(y)

export const outputChannel = vscode.window.createOutputChannel("Rightclick Git")
