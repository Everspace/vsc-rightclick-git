
export const stageChanges = vscode.commands.registerCommand(
  "rightclick-git.stageChanges",
  async (_, allSelected: vscode.Uri[]) => {
    const { files, directories } = await sortFilesAndDirs(...allSelected)

    const allFiles = await Promise.all(directories.map(getAllFiles))
    allFiles.push(files)
    const fileList: vscode.Uri[] = allFiles.reduce(concat, [])
