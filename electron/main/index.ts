import { app, BrowserWindow, shell, ipcMain, screen, Menu } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

const pkg = require(path.join(process.env.APP_ROOT, 'package.json'))
const BUILD_FLAVOR = pkg.buildFlavor || process.env.BUILD_FLAVOR || 'public'
const IS_DEV_FLAVOR = BUILD_FLAVOR === 'dev'

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  win = new BrowserWindow({
    title: 'Main window',
    width,
    height,
    fullscreenable: false,
    icon: path.join(process.env.VITE_PUBLIC as string, 'favicon.ico'),
    webPreferences: {
      preload,
      devTools: IS_DEV_FLAVOR || !!VITE_DEV_SERVER_URL
    }
  })

  if (!IS_DEV_FLAVOR && !VITE_DEV_SERVER_URL) {
    Menu.setApplicationMenu(null)
  }

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    if (IS_DEV_FLAVOR) win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
    if (IS_DEV_FLAVOR) win.webContents.openDevTools()
  }

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  win.webContents.on('before-input-event', (event, input) => {
    if (!IS_DEV_FLAVOR && !VITE_DEV_SERVER_URL) {
      if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
        event.preventDefault()
      }
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      devTools: IS_DEV_FLAVOR || !!VITE_DEV_SERVER_URL,
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
    if (IS_DEV_FLAVOR) childWindow.webContents.openDevTools()
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
    if (IS_DEV_FLAVOR) childWindow.webContents.openDevTools()
  }
})
