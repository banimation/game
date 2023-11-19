import {app , BrowserWindow, Menu, ipcMain} from "electron"
import path from "node:path"
import Store from 'electron-store'

const store = new Store()

function createWindow () {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        title: "The Game",
        webPreferences: {
            nodeIntegration: true,
            backgroundThrottling: false
        }
    })
    
    win.loadFile(path.join(__dirname, "../public/html/login.html"))
    ipcMain.on("store-session", (res) => {
        store.set("session-userData", res)
    })
    // Menu.setApplicationMenu(Menu.buildFromTemplate([]));
    win.webContents.once("did-finish-load", () => {})
}

app.whenReady().then(() => {
    createWindow()
})