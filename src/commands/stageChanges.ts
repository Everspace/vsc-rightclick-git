import * as vscode from "vscode"
import { outputChannel, concat } from "../common"
import { getAllFiles, sortFilesAndDirs } from "../files"
import { runGit } from "../git"

// TODO: Do stuff with outputChannel in case things go pearshaped.

// hoveredItem: Uri, allSelected: Uri[] =>
// allSelected contains hoveredItem

export const stageChanges = vscode.commands.registerCommand(
  "rightclick-git.stageChanges",
  async (_, allSelected: vscode.Uri[]) => {
    const { files, directories } = await sortFilesAndDirs(...allSelected)

    const allFiles = await Promise.all(directories.map(getAllFiles))
    allFiles.push(files)
    const fileList: vscode.Uri[] = allFiles.reduce(concat, [])

    const results = await runGit(["add"], fileList)

    if (results.missingRepo.length > 0) {
      vscode.window.showInformationMessage(
        "Some items skipped due to not being in a git repository",
      )
    }

    if (results.notOnThisEarth.length > 0) {
      vscode.window.showInformationMessage(
        "Some items skipped due to not being a local file",
      )
    }

    if (results.outOfWorkspace.length > 0) {
      vscode.window.showInformationMessage(
        "Some items skipped due to not being in a workspace",
      )
    }

    if (results.gitfailedProcesses.length > 0) {
      vscode.window.showErrorMessage(
        "A git processes encoutered an error\nYou could be trying to add an ignored file.",
      )
    }

    vscode.window.showInformationMessage("Staged files")
  },
)
