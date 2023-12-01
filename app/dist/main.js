"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const electron_store_1 = __importDefault(require("electron-store"));
const remoteMain = __importStar(require("@electron/remote/main"));
remoteMain.initialize();
const store = new electron_store_1.default();
if (!(store.get("session-userData") && store.get("session-roomData"))) {
    store.set("session-userData", {});
    store.set("session-roomData", {});
}
function createWindow() {
    const win = new electron_1.BrowserWindow({
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
    });
    win.maximize();
    win.fullScreen = true;
    remoteMain.enable(win.webContents);
    electron_1.ipcMain.on("store-session", (_event, req) => {
        store.set("session-userData", req);
    });
    electron_1.ipcMain.on("store-roomData-session-request", (_event, req) => __awaiter(this, void 0, void 0, function* () {
        yield new Promise((res) => {
            store.set("session-roomData", req);
            res("");
        });
        win.webContents.send("store-roomData-session-response");
    }));
    electron_1.ipcMain.on("session-request", () => {
        const data = {
            userData: store.get("session-userData"),
            roomData: store.get("session-roomData")
        };
        win.webContents.send("session-response", data);
    });
    win.loadFile(node_path_1.default.join(__dirname, "../public/html/login.html"));
    // Menu.setApplicationMenu(Menu.buildFromTemplate([]));
    win.webContents.once("did-finish-load", () => { });
}
electron_1.app.whenReady().then(() => {
    createWindow();
});
