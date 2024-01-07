import {app , BrowserWindow, Menu, ipcMain} from "electron"
import path from "node:path"
import Store from 'electron-store'
import * as remoteMain from '@electron/remote/main'
remoteMain.initialize();

const store = new Store()
if(!(store.get("session-userData") && store.get("session-roomData"))) {
    store.set("session-userData", {})
    store.set("session-roomData", {})
}

function createWindow () {
    const win = new BrowserWindow({
        width: 1200,
        height: 1200,
        title: "The Game",
        webPreferences: {
            plugins: true, 
            nodeIntegration: true, 
            contextIsolation: false,
            backgroundThrottling: false,
            webSecurity: false
        }
    })
    win.maximize()
    win.fullScreen = true
    remoteMain.enable(win.webContents)
    ipcMain.on("store-session", (_event, req) => {
        store.set("session-userData", req)
    })
    ipcMain.on("store-roomData-session-request", async (_event, req) => {
        await new Promise((res) => {
            store.set("session-roomData", req)
            res("")
        })
        win.webContents.send("store-roomData-session-response")
    })
    ipcMain.on("session-request", () => {
        const data = {
            userData: store.get("session-userData"),
            roomData:  store.get("session-roomData")
        }
        win.webContents.send("session-response", data)
    })
    win.loadFile(path.join(__dirname, "../public/html/login.html"))
    // Menu.setApplicationMenu(Menu.buildFromTemplate([]));
    win.webContents.once("did-finish-load", () => {})
}

app.whenReady().then(() => {
    createWindow()
})