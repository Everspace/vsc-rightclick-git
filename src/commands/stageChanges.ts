import * as vscode from "vscode"
import { outputChannel, runGit } from "../common"

// TODO: Do stuff with outputChannel in case things go pearshaped.

type FilesAndDirs = {
  files: vscode.Uri[]
  directories: vscode.Uri[]
}

const fs = vscode.workspace.fs

const concat = (x: any[], y: any[]) => x.concat(y)

const sortFilesAndDirs = async (
  ...uris: vscode.Uri[]
): Promise<FilesAndDirs> => {
  const withStat = await Promise.all(
    uris.map<Promise<[vscode.Uri, vscode.FileType]>>(async (uri) => [
      uri,
      (await fs.stat(uri)).type,
    ]),
  )

  const filesAndDirs = withStat.reduce<FilesAndDirs>(
    ({ files, directories }, [uri, type]) => {
      switch (type) {
        case vscode.FileType.File:
          files.push(uri)
          break
        case vscode.FileType.Directory:
          directories.push(uri)
          break
      }
      return { files, directories }
    },
    { files: [], directories: [] },
  )

  return filesAndDirs
}

const getAllFiles = async (uri: vscode.Uri): Promise<vscode.Uri[]> => {
  const allSubFilesRaw = await fs.readDirectory(uri)
  const { files, directories } = allSubFilesRaw.reduce<FilesAndDirs>(
    ({ files, directories }, [name, type]) => {
      const newUri = uri.with({ path: `${uri.path}/${name}` })
      switch (type) {
        case vscode.FileType.File:
          files.push(newUri)
          break
        case vscode.FileType.Directory:
          directories.push(newUri)
          break
      }
      return { files, directories }
    },
    { files: [], directories: [] },
  )

  const allFiles = await Promise.all(directories.map(getAllFiles))
  allFiles.push(files)

  return allFiles.reduce(concat, [])
}

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
