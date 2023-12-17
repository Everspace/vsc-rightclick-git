import * as vscode from "vscode"
import { concat } from "../common"
import { getAllFiles, sortFilesAndDirs } from "../files"
import { runGit, displayGitResults } from "../git"

export const stageChanges = vscode.commands.registerCommand(
  "rightclick-git.stageChanges",
  async (file: vscode.Uri, allSelected: vscode.Uri[] | { groupId: number }) => {
    // clicking on editor title context menu returns an object as the second arg
    const { files, directories } = Array.isArray(allSelected)
      ? await sortFilesAndDirs(...allSelected)
      : { files: [file], directories: [] }

    const allFiles = await Promise.all(directories.map(getAllFiles))
    allFiles.push(files)
    const fileList: vscode.Uri[] = allFiles.reduce(concat, [])

    const results = await runGit(["add"], fileList)
    displayGitResults(results)

    const count = results.affectedFiles.length;
    vscode.window.showInformationMessage(
      `Rightclick Git: Staged ${count} file` + (count !== 1 ? 's' : ''),
    )
  },
)
