import * as vscode from "vscode"
import { stageChanges } from "./commands/stageChanges"

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log("Rightclick Git is now active")
  context.subscriptions.push(stageChanges)
}

// this method is called when your extension is deactivated
export function deactivate() {}
