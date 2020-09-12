import * as vscode from "vscode"
import { discardChanges } from "./commands/discardChanges"
import { stageChanges } from "./commands/stageChanges"
import { unstageChanges } from "./commands/unstageChanges"

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log("Rightclick Git is now active")
  context.subscriptions.push(discardChanges)
  context.subscriptions.push(stageChanges)
  context.subscriptions.push(unstageChanges)
}

// this method is called when your extension is deactivated
export function deactivate() {}
