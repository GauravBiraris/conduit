// import { contextBridge, ipcRenderer } from 'electron';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
 
  runPythonETL: (recipeData, engineConfig) => ipcRenderer.invoke('run-python-etl', recipeData, engineConfig),
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),

  profileDatabase: (configStr) => ipcRenderer.invoke('profile-database', configStr),
  runSimulation: (engineConfig) => ipcRenderer.invoke('run-simulation', engineConfig)
});