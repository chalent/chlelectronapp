import { BrowserWindow, ipcMain } from 'electron'

export function registerIpcHandlers(): void {
  // ===== 系统相关 =====
  ipcMain.handle('system:get-platform', () => {
    return process.platform
  })

  // ===== 窗口控制 =====
  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  // 后续在这里继续添加 file:、dialog: 等 handler
}