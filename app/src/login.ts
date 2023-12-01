import { ipcRenderer } from "electron"
import { io } from "socket.io-client"

const socket = io("http://175.210.246.237:3000")
ipcRenderer.send("session-request")
ipcRenderer.on("session-response", (_event, res) => {
    const session = res
    if(session.userData.uid && session.userData.id) {
        location.replace("room.html")
    }
})
const loginBtn = document.getElementById("login") as HTMLInputElement
loginBtn.addEventListener('click', () => {
    const id = (document.getElementById("id") as HTMLInputElement).value
    const pw = (document.getElementById("password") as HTMLInputElement).value
    const data = { id, pw }
    socket.emit("login-request", data)
    socket.on("login-response", (res) => {
        if(res.verifit) {
            ipcRenderer.send("store-session", res.sessionData)
            location.replace("room.html")
        } else {
            alert("faild login, check your Id and Password")
        }
    })
})