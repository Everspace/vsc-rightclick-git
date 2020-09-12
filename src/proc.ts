import * as child_process from "child_process"

export const execProcess = async (
  cmd: string[],
  options: child_process.ExecOptions,
): Promise<child_process.ChildProcess> => {
  return new Promise((resolve, reject) => {
    const p = child_process.exec(cmd.join(" "), options)

    p.addListener("error", () => {
      reject(p)
    })
    p.addListener("exit", (code) => {
      if (code === 0) {
        resolve(p)
      } else {
        reject(p)
      }
    })
    p.addListener("close", (code) => {
      if (code === 0) {
        resolve(p)
      } else {
        reject(p)
      }
    })
  })
}
