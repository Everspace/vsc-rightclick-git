import * as vscode from "vscode"
import { outputChannel, concat } from "../common"
import { getAllFiles, sortFilesAndDirs } from "../files"
import { getGit, bucketByRepository } from "../git"

export const discardChanges = vscode.commands.registerCommand(
  "rightclick-git.discardChanges",
  async (file: vscode.Uri, allSelected: vscode.Uri[] | { groupId: number }) => {
    // clicking on editor title context menu returns an object as the second arg
    const { files, directories } = Array.isArray(allSelected)
      ? await sortFilesAndDirs(...allSelected)
      : { files: [file], directories: [] }

    const allFiles = await Promise.all(directories.map(getAllFiles))
    allFiles.push(files)
    const fileList: vscode.Uri[] = allFiles.reduce(concat, [])
    const { missingRepo, ...repoLocations } = bucketByRepository(fileList)

    const git = getGit()

    const count = Object.values(repoLocations).reduce(
      (val, item) => val + item.length,
      0,
    )

    if (count === 0) {
      vscode.window.showInformationMessage(
        "Rightclick Git: Skipping, no files found",
      )
      return
    }

    // TODO: Find the correct window for this? The native one preferably.
    const results = await vscode.window.showInputBox({
      prompt: `Rightclick Git: Are you sure you want to lose changes on OR DELETE FOREVER to $count files?`.replace(
        "$count",
        count.toString(),
      ),
    })

    if (results === undefined) {
      vscode.window.showInformationMessage(
        "Rightlick Git: Aborted discard changes",
      )
      return
    }

    for (const uris of Object.values(repoLocations)) {
      // We just get the first one
      const repo = git.getRepository(uris[0])
      if (!repo) {
        vscode.window.showWarningMessage(
          `Rightclick Git: Could not get repo of ${uris[0].fsPath}`,
        )
        continue
      }
      try {
        repo.clean(uris.map((uri) => uri.fsPath))
      } catch (e) {
        vscode.window.showErrorMessage(
          "Rightclick Git: encountered error discarding changes, check log for more info",
        )
        outputChannel.appendLine(e)
      }
    }
  },
)
