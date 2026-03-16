import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

// Reconstruct __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
Menu.setApplicationMenu(null);
  function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
if (app.isPackaged) {
    // In production, load the static HTML file built by Vite
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    // In development, load the Vite dev server
    const startUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(startUrl);
  }
  
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---  NATIVE FILE PICKER ---
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });
  
  if (canceled || filePaths.length === 0) {
    return null;
  } else {
    const filePath = filePaths[0];
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return { filePath, fileContent };
  }
});

// ---  DATABASE PROFILER IPC ---
// --- NEW DATABASE PROFILER IPC ---
ipcMain.handle('profile-database', async (event, configStr) => {
  return new Promise((resolve) => {
    const isPackaged = app.isPackaged;
    let enginePath, pythonProcess;

    if (isPackaged) {
      // Production: Use the compiled .exe
      enginePath = path.join(process.resourcesPath, 'engine', 'db_profiler.exe');
      pythonProcess = spawn(enginePath, [configStr]);
    } else {
      // Development: Run the standard python script
      enginePath = path.join(__dirname, '..', 'engine', 'db_profiler.py');
      pythonProcess = spawn('python', [enginePath, configStr]);
    }

    let output = '';
    pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { console.error("Python Error: ", data.toString()); });

    pythonProcess.on('close', () => {
      try {
        resolve(JSON.parse(output)); 
      } catch(e) {
        resolve({ success: false, error: 'Failed to parse python output. Ensure python dependencies are installed.' });
      }
    });
  });
});

// --- IPC LISTENER: TRIGGER PYTHON ENGINE ---
ipcMain.handle('run-python-etl', async (event, recipeJSON, engineConfig) => {
  return new Promise((resolve, reject) => {
    try {
      // 1. Save the React-generated Recipe to a temporary local file
      const tempRecipePath = path.join(os.tmpdir(), 'actus_recipe.json');
      fs.writeFileSync(tempRecipePath, JSON.stringify(recipeJSON, null, 2));

// 2. Locate the Engine based on Environment
      const isPackaged = app.isPackaged;
      let enginePath, pythonProcess;

      if (isPackaged) {
        // Production: Use the compiled .exe inside the resources folder
        enginePath = path.join(process.resourcesPath, 'engine', 'actus_engine.exe');
        pythonProcess = spawn(enginePath, [tempRecipePath, JSON.stringify(engineConfig)]);
      } else {
        // Development: Run the standard python script
        enginePath = path.join(__dirname, '..', 'engine', 'actus_engine.py');
        pythonProcess = spawn('python', [enginePath, tempRecipePath, JSON.stringify(engineConfig)]);
      }
      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
      pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

      pythonProcess.on('close', (code) => {
        if (code === 0) resolve({ success: true, message: output });
        else resolve({ success: false, message: errorOutput });
      });
    } catch (err) {
      resolve({ success: false, message: err.message });
    }
  });
});

// --- SIMULATION IPC ---
ipcMain.handle('run-simulation', async (event, engineConfig) => {
  return new Promise((resolve) => {
    const isPackaged = app.isPackaged;
    let enginePath, pythonProcess;

    if (isPackaged) {
      enginePath = path.join(process.resourcesPath, 'engine', 'simulation_engine.exe');
      pythonProcess = spawn(enginePath, [JSON.stringify(engineConfig)]);
    } else {
      enginePath = path.join(__dirname, '..', 'engine', 'simulation_engine.py');
      pythonProcess = spawn('python', [enginePath, JSON.stringify(engineConfig)]);
    }

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

    pythonProcess.on('close', (code) => {
      // Look for our magic string to extract the chart data
      const chartMarker = "___CHART_DATA___";
      let chartData = null;
      let cleanOutput = output;

      if (output.includes(chartMarker)) {
        const parts = output.split(chartMarker);
        cleanOutput = parts[0];
        try { chartData = JSON.parse(parts[1]); } catch(e) {}
      }

      if (code === 0) resolve({ success: true, message: cleanOutput, chartData });
      else resolve({ success: false, message: errorOutput || cleanOutput });
    });
  });
});
