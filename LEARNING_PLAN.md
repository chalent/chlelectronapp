# EasyNotes 随手记 - Electron 学习计划

## 📌 项目概述

**项目名称**: EasyNotes  
**项目类型**: 桌面便签应用  
**学习周期**: 12 天（每天 1-2 小时）

**最终效果预览**:
- 一个小巧的便签应用
- 支持创建/编辑/删除便签
- 最小化到系统托盘
- 全局快捷键呼出
- 数据本地持久化存储

---

## 📚 学习阶段总览

| 阶段 | 周期 | 主题 | 核心 API |
|------|------|------|----------|
| 一 | Day 1-2 | 项目架构 & 窗口管理 | BrowserWindow, app, preload |
| 二 | Day 3-4 | 进程间通信 IPC | ipcMain, ipcRenderer, contextBridge |
| 三 | Day 5-6 | 原生 UI | Menu, Tray |
| 四 | Day 7-8 | 原生交互 | dialog, shell, clipboard, globalShortcut |
| 五 | Day 9-10 | 数据持久化 | fs, electron-store |
| 六 | Day 11-12 | 高级特性 | alwaysOnTop, nativeTheme, 多窗口 |

---

## 🎯 阶段一：项目架构 & 窗口管理

### 学习目标
- [ ] 理解 Electron 主进程/渲染进程/预加载脚本的角色
- [ ] 掌握 BrowserWindow 的创建和配置
- [ ] 学会使用 preload 脚本安全桥接进程

### 学习内容

#### 1.1 Electron 架构基础

**核心概念**:
```
┌─────────────────────────────────────────────┐
│              Main Process (主进程)           │
│  • 拥有 Node.js 环境                        │
│  • 控制应用生命周期                          │
│  • 创建 BrowserWindow                        │
│  • 访问原生资源                              │
└─────────────────────────────────────────────┘
                      ↕ IPC
┌─────────────────────────────────────────────┐
│           Renderer Process (渲染进程)        │
│  • 运行网页 (Chromium)                       │
│  • 不能直接访问 Node.js                      │
│  • 通过 preload 脚本安全通信                  │
└─────────────────────────────────────────────┘
```

**关键 API**:
- `app` - 控制应用生命周期
- `BrowserWindow` - 创建和管理窗口
- `webContents` - 控制页面内容

#### 1.2 BrowserWindow 配置项

```typescript
const win = new BrowserWindow({
  // 窗口尺寸
  width: 400,
  height: 500,
  minWidth: 300,
  minHeight: 400,
  
  // 窗口行为
  resizable: true,      // 是否可调整大小
  maximizable: true,     // 是否可最大化
  minimizable: true,     // 是否可最小化
  closable: true,        // 是否可关闭
  
  // 窗口外观
  frame: true,           // 是否显示原生窗口边框
  transparent: false,     // 是否透明背景
  titleBarStyle: 'default', // 标题栏样式
  
  // 永远置顶
  alwaysOnTop: false,
  
  // 窗口位置
  x: undefined,
  y: undefined,
  center: true,          // 是否居中显示
  
  // 网页内容
  webPreferences: {
    preload: 'preload.js',      // 预加载脚本路径
    contextIsolation: true,     // 隔离上下文（必须为 true）
    nodeIntegration: false,      // 禁止 Node.js（必须为 false）
    sandbox: true,               // 沙箱模式
  }
})
```

#### 1.3 app 生命周期

```typescript
import { app } from 'electron'

// 应用准备就绪
app.whenReady().then(() => {
  // 创建窗口
  createWindow()
})

// macOS: 所有窗口关闭时
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// macOS: 点击 Dock 图标时
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 应用即将退出
app.on('will-quit', () => {
  // 清理工作
})
```

### 今日任务

**Day 1 任务**:
1. 重构现有项目结构，添加 `preload.ts`
2. 实现无边框窗口（可选，先做标准窗口）
3. 添加自定义窗口控制按钮（最小化/最大化/关闭）

**Day 2 任务**:
1. 实现窗口拖拽移动
2. 添加窗口大小限制
3. 实现窗口居中/记忆位置

### 练习题

1. 如何创建一个 800x600 的居中窗口？
2. 如何让窗口始终置顶？
3. 为什么 `nodeIntegration` 应该设为 `false`？
4. preload 脚本的作用是什么？

---

## 🎯 阶段二：进程间通信 IPC

### 学习目标
- [ ] 理解 IPC 通信的两种模式
- [ ] 掌握 invoke/handle 和 send/on 的使用场景
- [ ] 学会使用 contextBridge 安全暴露 API

### 学习内容

#### 2.1 IPC 通信模式

**模式一：invoke/handle（双向，异步，推荐）**
```typescript
// 主进程 - 处理请求
import { ipcMain } from 'electron'

ipcMain.handle('note:load', async () => {
  return await loadNotesFromFile()
})

ipcMain.handle('note:save', async (event, note) => {
  return await saveNoteToFile(note)
})
```

```typescript
// 渲染进程 - 调用
const notes = await window.electronAPI.loadNotes()
await window.electronAPI.saveNote(note)
```

**模式二：send/on（单向，用于事件通知）**
```typescript
// 主进程 - 监听
ipcMain.on('window:minimize', () => {
  mainWindow.minimize()
})

ipcMain.on('window:close', () => {
  mainWindow.close()
})
```

```typescript
// 渲染进程 - 发送
window.electronAPI.minimize()
window.electronAPI.close()
```

#### 2.2 contextBridge 安全暴露

**preload.ts 完整示例**:
```typescript
import { contextBridge, ipcRenderer } from 'electron'

interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

interface ElectronAPI {
  // 窗口控制
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  
  // 便签操作
  loadNotes: () => Promise<Note[]>
  saveNote: (note: Note) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  
  // 事件监听
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => void
}

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  
  // 便签操作
  loadNotes: () => ipcRenderer.invoke('note:load'),
  saveNote: (note: Note) => ipcRenderer.invoke('note:save', note),
  deleteNote: (id: string) => ipcRenderer.invoke('note:delete', id),
  
  // 事件监听
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('window:maximizeChange', (event, isMaximized) => {
      callback(isMaximized)
    })
  }
} satisfies ElectronAPI)

// 声明全局类型
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

### 今日任务

**Day 3 任务**:
1. 创建 `preload.ts` 文件
2. 实现窗口控制的 IPC 通信
3. 在渲染进程调用这些 API

**Day 4 任务**:
1. 设计 Note 数据结构
2. 实现便签的增删改查 IPC
3. 添加类型提示

### 练习题

1. invoke/handle 和 send/on 的区别是什么？
2. 为什么需要 contextBridge？
3. 如何实现从渲染进程向主进程传递参数？

---

## 🎯 阶段三：原生 UI - 菜单 & 托盘

### 学习目标
- [ ] 掌握 Menu 和 MenuItem 的使用
- [ ] 学会创建系统托盘应用
- [ ] 实现托盘菜单交互

### 学习内容

#### 3.1 应用菜单

**基本菜单**:
```typescript
import { Menu, MenuItem, app } from 'electron'

const template: Electron.MenuItemConstructorOptions[] = [
  {
    label: '文件',
    submenu: [
      {
        label: '新建便签',
        accelerator: 'CmdOrCtrl+N',
        click: () => mainWindow.webContents.send('menu:newNote')
      },
      { type: 'separator' },
      {
        label: '导出',
        click: () => mainWindow.webContents.send('menu:export')
      },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: '编辑',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'delete' },
      { type: 'separator' },
      { role: 'selectAll' }
    ]
  },
  {
    label: '视图',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: '帮助',
    submenu: [
      {
        label: '关于',
        click: () => {
          // 显示关于对话框
        }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
```

#### 3.2 系统托盘

```typescript
import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

function createTray() {
  // 创建托盘图标（可以使用本地图片或生成）
  const icon = nativeImage.createFromPath(join(__dirname, '../icon.png'))
  
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    {
      label: '新建便签',
      click: () => {
        mainWindow.show()
        mainWindow.webContents.send('menu:newNote')
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])
  
  tray.setToolTip('EasyNotes - 随手记')
  tray.setContextMenu(contextMenu)
  
  // 点击托盘图标显示窗口
  tray.on('click', () => {
    mainWindow.show()
    mainWindow.focus()
  })
}
```

### 今日任务

**Day 5 任务**:
1. 实现应用菜单（文件/编辑/视图/帮助）
2. 添加快捷键绑定

**Day 6 任务**:
1. 创建系统托盘
2. 实现托盘菜单
3. 添加托盘图标点击事件

---

## 🎯 阶段四：原生交互

### 学习目标
- [ ] 掌握 dialog 对话框的使用
- [ ] 学会使用 shell 打开外部资源
- [ ] 实现全局快捷键

### 学习内容

#### 4.1 dialog 对话框

```typescript
import { dialog, BrowserWindow } from 'electron'

// 打开文件对话框
const result = await dialog.showOpenDialog(mainWindow, {
  title: '选择笔记文件',
  defaultPath: app.getPath('documents'),
  filters: [
    { name: 'JSON 文件', extensions: ['json'] },
    { name: '所有文件', extensions: ['*'] }
  ],
  properties: ['openFile']
})

if (!result.canceled && result.filePaths.length > 0) {
  const filePath = result.filePaths[0]
  // 处理文件
}

// 保存文件对话框
const saveResult = await dialog.showSaveDialog(mainWindow, {
  title: '导出笔记',
  defaultPath: 'notes.json',
  filters: [
    { name: 'JSON 文件', extensions: ['json'] }
  ]
})

if (!saveResult.canceled && saveResult.filePath) {
  const filePath = saveResult.filePath
  // 保存文件
}

// 消息对话框
const msgResult = await dialog.showMessageBox(mainWindow, {
  type: 'question',
  buttons: ['取消', '确定'],
  defaultId: 1,
  title: '确认删除',
  message: '确定要删除这条笔记吗？'
})

if (msgResult.response === 1) {
  // 用户点击了确定
}
```

#### 4.2 shell 模块

```typescript
import { shell } from 'electron'

// 在默认浏览器中打开链接
await shell.openExternal('https://github.com')

// 在文件管理器中打开文件夹
await shell.openPath(app.getPath('documents'))

// 显示文件在文件夹中（并选中）
await shell.showItemInFolder(filePath)
```

#### 4.3 clipboard 剪贴板

```typescript
import { clipboard } from 'electron'

// 写入文本
clipboard.writeText('Hello World')

// 读取文本
const text = clipboard.readText()

// 写入 HTML
clipboard.writeHTML('<b>Bold</b>')

// 清除
clipboard.clear()
```

#### 4.4 globalShortcut 全局快捷键

```typescript
import { globalShortcut } from 'electron'

// 注册全局快捷键
const registered = globalShortcut.register('CommandOrControl+Shift+N', () => {
  mainWindow.show()
  mainWindow.focus()
  mainWindow.webContents.send('menu:newNote')
})

if (!registered) {
  console.log('快捷键注册失败')
}

// 检查快捷键是否已注册
const isRegistered = globalShortcut.isRegistered('CommandOrControl+Shift+N')

// 注销快捷键（应用退出时自动注销）
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
```

### 今日任务

**Day 7 任务**:
1. 实现笔记导出功能（保存对话框）
2. 实现笔记导入功能（打开文件对话框）

**Day 8 任务**:
1. 注册全局快捷键 `Ctrl+Shift+N` 呼出应用
2. 添加复制/粘贴快捷键支持

---

## 🎯 阶段五：数据持久化

### 学习目标
- [ ] 掌握 Node.js 文件系统操作
- [ ] 学会使用 electron-store 简化存储
- [ ] 实现笔记数据的增删改查

### 学习内容

#### 5.1 文件系统基础

```typescript
import { app } from 'electron'
import fs from 'fs/promises'
import { join } from 'path'

// 获取应用数据目录
const dataPath = join(app.getPath('userData'), 'data')
const notesFile = join(dataPath, 'notes.json')

// 确保目录存在
async function ensureDir() {
  try {
    await fs.access(dataPath)
  } catch {
    await fs.mkdir(dataPath, { recursive: true })
  }
}

// 保存笔记
async function saveNotes(notes: Note[]) {
  await ensureDir()
  await fs.writeFile(notesFile, JSON.stringify(notes, null, 2), 'utf-8')
}

// 加载笔记
async function loadNotes(): Promise<Note[]> {
  try {
    await ensureDir()
    const data = await fs.readFile(notesFile, 'utf-8')
    return JSON.parse(data)
  } catch {
    return [] // 文件不存在时返回空数组
  }
}
```

#### 5.2 electron-store（推荐）

```typescript
import Store from 'electron-store'

interface Note {
  id: string
  title: string
  content: string
  color: string
  createdAt: number
  updatedAt: number
}

interface StoreSchema {
  notes: Note[]
  settings: {
    theme: 'light' | 'dark'
    alwaysOnTop: boolean
    windowBounds: {
      x: number
      y: number
      width: number
      height: number
    }
  }
}

const store = new Store<StoreSchema>({
  name: 'easynotes-data', // 文件名（不含扩展名）
  defaults: {
    notes: [],
    settings: {
      theme: 'light',
      alwaysOnTop: false,
      windowBounds: { x: 100, y: 100, width: 400, height: 500 }
    }
  }
})

// 使用示例
store.set('notes', [...notes, newNote])
const notes = store.get('notes')
const settings = store.get('settings')

// 监听变化
store.onDidChange('settings', (newValue, oldValue) => {
  console.log('设置已更新')
})
```

### 今日任务

**Day 9 任务**:
1. 安装 electron-store: `npm install electron-store`
2. 创建数据存储模块
3. 实现笔记的 CRUD 操作

**Day 10 任务**:
1. 保存窗口位置
2. 实现设置功能（主题、置顶）

---

## 🎯 阶段六：高级特性

### 学习目标
- [ ] 实现窗口置顶功能
- [ ] 响应系统主题变化
- [ ] 优化多窗口管理

### 学习内容

#### 6.1 置顶功能

```typescript
// 切换置顶
ipcMain.handle('window:toggleAlwaysOnTop', () => {
  const isOnTop = mainWindow.isAlwaysOnTop()
  mainWindow.setAlwaysOnTop(!isOnTop)
  return !isOnTop
})

// 获取当前状态
ipcMain.handle('window:getAlwaysOnTop', () => {
  return mainWindow.isAlwaysOnTop()
})
```

#### 6.2 主题切换

```typescript
import { nativeTheme, ipcMain } from 'electron'

// 监听系统主题变化
nativeTheme.on('updated', () => {
  mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors)
})

// 设置主题源
nativeTheme.themeSource = 'system' // 'system' | 'light' | 'dark'

// 获取当前是否为深色模式
const isDark = nativeTheme.shouldUseDarkColors
```

#### 6.3 窗口状态管理

```typescript
// 保存窗口状态
function saveWindowState() {
  const bounds = mainWindow.getBounds()
  store.set('settings.windowBounds', bounds)
  store.set('settings.isMaximized', mainWindow.isMaximized())
}

// 恢复窗口状态
function restoreWindowState() {
  const { windowBounds, isMaximized } = store.get('settings')
  
  mainWindow.setBounds(windowBounds)
  
  if (isMaximized) {
    mainWindow.maximize()
  }
}

// 在关闭前保存
mainWindow.on('close', () => {
  saveWindowState()
})
```

### 今日任务

**Day 11 任务**:
1. 实现置顶/取消置顶功能
2. 添加置顶按钮 UI

**Day 12 任务**:
1. 响应系统主题变化
2. 实现窗口状态记忆
3. 整理代码，添加注释

---

## 📦 项目结构

```
my-electron-demo/
├── package.json          # 项目配置
├── tsconfig.json          # TypeScript 配置
├── main.ts                # 主进程入口
├── preload.ts             # 预加载脚本
├── index.html             # 渲染进程入口
├── src/
│   ├── renderer.ts        # 渲染进程逻辑
│   └── renderer.css       # 样式文件
├── store/
│   └── index.ts           # 数据存储模块
├── ipc/
│   └── handlers.ts        # IPC 处理器
└── dist/                  # 编译输出目录
```

---

## 🎓 学习资源

### 官方文档
- [Electron 官方文档](https://www.electronjs.org/docs)
- [Electron API 演示](https://electronjs.org/#get-started)

### 推荐阅读
1. [Electron 安全最佳实践](https://www.electronjs.org/docs/tutorial/security)
2. [Context Isolation 详解](https://www.electronjs.org/docs/tutorial/context-isolation)
3. [IPC 通信详解](https://www.electronjs.org/docs/tutorial/ipc)

---

## ✅ 学习检查清单

完成每个阶段后，在对应位置打勾：

- [ ] 阶段一：项目架构 & 窗口管理
- [ ] 阶段二：进程间通信 IPC
- [ ] 阶段三：原生 UI - 菜单 & 托盘
- [ ] 阶段四：原生交互
- [ ] 阶段五：数据持久化
- [ ] 阶段六：高级特性

---

## 🚀 下一步

准备好开始学习了吗？我们从 **阶段一：项目架构 & 窗口管理** 开始？

需要我帮你搭建初始项目结构吗？
