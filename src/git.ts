import * as vscode from "vscode"
import { GitExtension } from "./types/git"
import { ChildProcess } from "child_process"
import { execProcess } from "./proc"
import { outputChannel } from "./common"

/**
 * Sort items by which repo it is in.
 * @param uris
 * @returns Record<string, vscode.Uri>, "missingRepo" is one of the keys for all that are missing.
 */
export const bucketByRepository = (uris: vscode.Uri[]) => {
  const git = getGit()
  return uris.reduce<Record<string, vscode.Uri[]>>((mem, uri) => {
    const repo = git.getRepository(uri)
    if (repo === null) {
      mem.missingRepo = mem?.missingRepo ?? []
      mem.missingRepo.push(uri)
      return mem
    }
    let path = repo.rootUri.toString()
    mem[path] = mem[path] ?? []
    mem[path].push(uri)
    return mem
  }, {})
}

export const getGit = () => {
  const git = vscode.extensions
    .getExtension<GitExtension>("vscode.git")
    ?.exports?.getAPI(1)
  if (!git) {
    vscode.window.showErrorMessage("Could not get git API")
    throw new Error("missing git")
  }
  return git
}

type RunGitResults = {
  affectedFiles: vscode.Uri[]
  /**
   * Files that are a part of a "filed" run of git.
   */
  failedFiles: vscode.Uri[]
  missingRepo: vscode.Uri[]
  outOfWorkspace: vscode.Uri[]
  /**
   * Not actually on the filesystem??!
   * (non file scheme)
   */
  notOnThisEarth: vscode.Uri[]
  /**
   * the particular commands that resulted in
   */
  gitProcesses: ChildProcess[]
  /**
   * Non 0 length was "something is up"
   */
  gitfailedProcesses: ChildProcess[]
}

/**
 * Runs a series of git commands to execute `commands` safely handling and batching
 * based on where the file is (local mutli-workspace stuff), cd'ing into the repository's
 * root before going to commit the files.
 * @param commands The various things like switches and commands that suffix git (-s add)
 * @param files The list of uris to operate on
 */
export const runGit = async (
  commands: string[],
  files: vscode.Uri[],
): Promise<RunGitResults> => {
  const git = getGit()

  const info: RunGitResults = {
    missingRepo: [],
    outOfWorkspace: [],
    notOnThisEarth: [],
    affectedFiles: [],
    failedFiles: [],
    gitProcesses: [],
    gitfailedProcesses: [],
  }

  /**
   * Working directory: files in that working directory.
   * Seperated by repo.
   */
  const batches: Record<string, vscode.Uri[]> = {}

  for (const file of files) {
    const repoOfFile = git.getRepository(file)
    if (!repoOfFile) {
      info.missingRepo.push(file)
      continue
    }

    const workspaceOfFile = vscode.workspace.getWorkspaceFolder(file)
    if (!workspaceOfFile) {
      info.missingRepo.push(file)
      continue
    }

    // Could be ftp or some nonsense
    if (workspaceOfFile.uri.scheme !== "file") {
      info.notOnThisEarth.push(file)
      continue
    }

    const repoRoot = repoOfFile.rootUri.fsPath
    batches[repoRoot] = batches[repoRoot] ?? []
    batches[repoRoot].push(file)
  }

  const cmd: string[] = [`"${git.git.path}"`, ...commands]

  try {
    type Batch = { process: Promise<ChildProcess>; files: vscode.Uri[] }
    const processes: Batch[] = Object.entries(batches).map(
      ([cwd, toMutate]) => ({
        process: execProcess(
          [...cmd, ...toMutate.map((file) => `"${file.fsPath}"`)],
          {
            cwd,
            windowsHide: true,
            env: process.env,
          },
        ),
        files: toMutate,
      }),
    )

    for (const batch of processes) {
      // This could be more parallel? But like, lets not.
      const process = await batch.process
      if (process.exitCode === 0) {
        info.gitProcesses.push(process)
        info.affectedFiles = info.affectedFiles.concat(batch.files)
      } else {
        info.gitfailedProcesses.push(process)
        info.failedFiles.concat(batch.files)
      }
    }
  } catch (error) {
    if (typeof error === "object") {
      if (error?.pid) {
        info.gitfailedProcesses.push(error)
      } else {
        throw error
      }
    } else {
      throw error
    }
  }
  return info
}

export const displayGitResults = (results: RunGitResults): boolean => {
  if (results.missingRepo.length > 0) {
    vscode.window.showInformationMessage(
      "Rightclick Git: Some items skipped due to not being in a git repository",
    )
    return false
  }

  if (results.notOnThisEarth.length > 0) {
    vscode.window.showInformationMessage(
      "Rightclick Git: Some items skipped due to not being a local file",
    )
    return false
  }

  if (results.outOfWorkspace.length > 0) {
    vscode.window.showInformationMessage(
      "Rightclick Git: Some items skipped due to not being in a workspace",
    )
    return false
  }

  if (results.gitfailedProcesses.length > 0) {
    vscode.window.showErrorMessage(
      "Rightclick Git: A git processes encountered an error\nYou could be trying to add an ignored file.",
    )
    return false
  }

  if (results.failedFiles.length > 0) {
    vscode.window.showErrorMessage(
      `Rightclick Git: A git processes failed on ${results.failedFiles.length}, a list is in console`,
    )
    outputChannel.appendLine("A git process failed on the following files:")
    outputChannel.appendLine(
      results.failedFiles.map((f) => `\t${f.fsPath}`).join("\n"),
    )
    outputChannel.show()

    return false
  }

  return true
}
