const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ssc", {
  selectProject: () => ipcRenderer.invoke("workspace:selectProject"),
  validateProject: (rootPath) => ipcRenderer.invoke("workspace:validateProject", rootPath),
  getProjectData: (rootPath) => ipcRenderer.invoke("workspace:getProjectData", rootPath),
  createPower: (payload) => ipcRenderer.invoke("workspace:createPower", payload),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggleMaximize"),
  closeWindow: () => ipcRenderer.invoke("window:close")
});
