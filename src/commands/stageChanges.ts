import * as vscode from "vscode"
import { concat } from "../common"
import { getAllFiles, sortFilesAndDirs } from "../files"
import { runGit, displayGitResults } from "../git"

export const stageChanges = vscode.commands.registerCommand(
  "rightclick-git.stageChanges",
  async (_, allSelected: vscode.Uri[]) => {
    const { files, directories } = await sortFilesAndDirs(...allSelected)

    const allFiles = await Promise.all(directories.map(getAllFiles))
    allFiles.push(files)
    const fileList: vscode.Uri[] = allFiles.reduce(concat, [])

    const results = await runGit(["add"], fileList)
    displayGitResults(results)

    vscode.window.showInformationMessage(
      `Rightclick Git: Staged ${results.affectedFiles.length} files`,
    )
  },
)
