const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const path = require("node:path");
const { createPower, getProjectData, validateProject } = require("./workspace.cjs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#17191c",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "../dist/renderer/index.html"));
  } else {
    win.loadURL("http://127.0.0.1:5173");
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  ipcMain.handle("workspace:selectProject", async () => {
    const result = await dialog.showOpenDialog({
      title: "选择 shape-shifter-curse-fabric 项目根目录",
      properties: ["openDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, validation: { ok: false, reason: "未选择目录" } };
    }

    const rootPath = result.filePaths[0];
    return { canceled: false, validation: await validateProject(rootPath) };
  });

  ipcMain.handle("workspace:validateProject", async (_event, rootPath) => validateProject(rootPath));
  ipcMain.handle("workspace:getProjectData", async (_event, rootPath) => getProjectData(rootPath));
  ipcMain.handle("workspace:createPower", async (_event, payload) => createPower(payload));
  ipcMain.handle("window:minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.handle("window:toggleMaximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    }
    win.maximize();
    return true;
  });
  ipcMain.handle("window:close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
