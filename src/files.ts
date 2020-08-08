import { Uri, FileType, workspace } from "vscode"
import { concat } from "./common"

const fs = workspace.fs

type FilesAndDirs = {
  files: Uri[]
  directories: Uri[]
}

export const sortFilesAndDirs = async (
  ...uris: Uri[]
): Promise<FilesAndDirs> => {
  const withStat = await Promise.all(
    uris.map<Promise<[Uri, FileType]>>(async (uri) => [
      uri,
      (await fs.stat(uri)).type,
    ]),
  )

  const filesAndDirs = withStat.reduce<FilesAndDirs>(
    ({ files, directories }, [uri, type]) => {
      switch (type) {
        case FileType.File:
          files.push(uri)
          break
        case FileType.Directory:
          directories.push(uri)
          break
      }
      return { files, directories }
    },
    { files: [], directories: [] },
  )

  return filesAndDirs
}

export const getAllFiles = async (uri: Uri): Promise<Uri[]> => {
  const allSubFilesRaw = await fs.readDirectory(uri)
  const { files, directories } = allSubFilesRaw.reduce<FilesAndDirs>(
    ({ files, directories }, [name, type]) => {
      const newUri = uri.with({ path: `${uri.path}/${name}` })
      switch (type) {
        case FileType.File:
          files.push(newUri)
          break
        case FileType.Directory:
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
