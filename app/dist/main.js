"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const electron_store_1 = __importDefault(require("electron-store"));
const store = new electron_store_1.default();
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        title: "The Game",
        webPreferences: {
            nodeIntegration: true,
            backgroundThrottling: false
        }
    });
    win.loadFile(node_path_1.default.join(__dirname, "../public/html/login.html"));
    electron_1.ipcMain.on("store-session", (res) => {
        store.set("session-userData", res);
    });
    // Menu.setApplicationMenu(Menu.buildFromTemplate([]));
    win.webContents.once("did-finish-load", () => { });
}
electron_1.app.whenReady().then(() => {
    createWindow();
});
