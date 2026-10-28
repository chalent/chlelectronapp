import { app, BrowserWindow, shell } from "electron";
import { join } from "path";
import { registerIpcHandlers } from "./ipc/index";
import { PollingService } from "./services/polling-service";
import { DeviceConfig, TagConfig } from "./drivers/types";
import { MockDriver } from "./drivers/mock-driver";
import { ModbusTcpDriver } from "./drivers/modbus-tcp-driver";

// 窗口引用（防止被 GC 回收）
let mainWindow: BrowserWindow | null = null;

// 轮询服务实例，全应用唯一
const pollingService = new PollingService();

/** 测试用设备配置，后续替换为配置文件加载 */
const deviceConfig: DeviceConfig = {
  id: "plc-01",
  name: "Line-A PLC",
  mode: "mock",
  host: "127.0.0.1",
  port: 8502,
  unitId: 1,
  pollIntervalMs: 1000,
  timeoutMs: 500,
};

/** 测试用点位定义，后续替换为配置文件加载 */
const tags: TagConfig[] = [
  {
    id: "tag-temp",
    deviceId: "plc-01",
    name: "Temperature",
    registerType: "holding",
    address: 0,
    dataType: "uint16",
    byteOrder: "AB",
    unit: "°C",
    writable: false,
  },
  {
    id: "tag-press",
    deviceId: "plc-01",
    name: "Pressure",
    registerType: "holding",
    address: 1,
    dataType: "uint16",
    byteOrder: "AB",
    unit: "kPa",
    writable: false,
  },
];

/** 按设备配置选择驱动实现 */
function createConnection(config: DeviceConfig) {
  return config.mode === "mock"
    ? new MockDriver(config)
    : new ModbusTcpDriver(config);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false, // 先隐藏，等 ready-to-show 再显示，避免白屏
    autoHideMenuBar: true,
    // 如果有图标，指向 build 目录下的 icon
    // icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      // 安全默认值：隔离上下文，禁止渲染进程直接访问 Node
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload 里用了 Node API 时需要关掉，否则保持 true
    },
  });

  // 窗口准备好后再显示，避免白屏闪烁
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  // 外部链接用系统浏览器打开，而不是在应用内新开窗口
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // 关键：开发环境加载 Vite 服务，生产环境加载打包文件
  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// ===== 应用生命周期 =====
app.whenReady().then(() => {
  // 注册 IPC 处理器，传入轮询服务
  registerIpcHandlers(pollingService);

  // 注册设备并启动轮询
  const connection = createConnection(deviceConfig);
  pollingService.registerDevice(deviceConfig, tags, connection);

  createWindow();

  // macOS 上点击 Dock 图标时，如果没有窗口则重新创建
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 除 macOS 外，关闭所有窗口时退出应用
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
