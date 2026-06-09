const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ssc", {
  selectProject: () => ipcRenderer.invoke("workspace:selectProject"),
  validateProject: (rootPath) => ipcRenderer.invoke("workspace:validateProject", rootPath),
  getProjectData: (rootPath) => ipcRenderer.invoke("workspace:getProjectData", rootPath),
  createPower: (payload) => ipcRenderer.invoke("workspace:createPower", payload),
  addPowerToForm: (payload) => ipcRenderer.invoke("workspace:addPowerToForm", payload),
  removePowerFromForm: (payload) => ipcRenderer.invoke("workspace:removePowerFromForm", payload),
  readPowerJson: (payload) => ipcRenderer.invoke("workspace:readPowerJson", payload),
  savePowerJson: (payload) => ipcRenderer.invoke("workspace:savePowerJson", payload),
  readBlueprintState: (payload) => ipcRenderer.invoke("workspace:readBlueprintState", payload),
  saveBlueprintState: (payload) => ipcRenderer.invoke("workspace:saveBlueprintState", payload),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggleMaximize"),
  closeWindow: () => ipcRenderer.invoke("window:close")
});
