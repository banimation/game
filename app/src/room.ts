import { io } from "socket.io-client"
import { ipcRenderer } from "electron"

const socket = io("http://175.210.246.237:3000")

const userName = document.getElementById("welcome") as HTMLElement
const createBtn = document.getElementById("createBtn") as HTMLInputElement
const reloadBtn = document.getElementById("reloadBtn") as HTMLElement
const roomList = document.getElementById("roomList") as HTMLElement
const playBtn = document.getElementById("play") as HTMLElement
const mainContainer = document.getElementById("main-container") as HTMLElement
const roomContainer = document.getElementById("room-container") as HTMLElement
const roomBack = document.getElementById("room-back") as HTMLElement

playBtn.addEventListener("click", () => {
    mainContainer.classList.add("main-container-hidden")
    roomContainer.classList.remove("room-container-hidden")
})

roomBack.addEventListener("click", () => {
    mainContainer.classList.remove("main-container-hidden")
    roomContainer.classList.add("room-container-hidden")
})

interface roomData {
    uid: number
    name: string
    max: number
    current: number
    owner: string
}

interface userSession {
    uid: number
    id: string
}

interface roomSession {
    uid: number
    name: string
    max: number
    current: number
    owner: string
}

let userSession: userSession
let roomSession: roomSession

ipcRenderer.send("session-request")
ipcRenderer.on("session-response", (_event, res) => {
    userSession = res.userData
    roomSession = res.roomData
    userName.innerText = `Welcome! ${userSession.id}`
})
const getRoomData = () => {
    socket.emit("getRooms-request")
    socket.on("getRooms-response", (res) => {
        roomList.replaceChildren()
        const roomData: Array<roomData> = res
        roomData.forEach((val) => {
            const room = document.createElement("div") as HTMLElement
            const name = document.createElement("div") as HTMLElement
            const description = document.createElement("div") as HTMLElement
            room.classList.add("room")
            name.classList.add("roomName")
            description.classList.add("roomDescription")
            name.innerText = `${val.name}  (${val.current}/${val.max})`
            description.innerText = ` owner: ${val.owner}`
            room.append(name, description)
            roomList.append(room)
            room.addEventListener("click", () => {
                const data = {roomUid: val.uid, roomName: val.name}
                socket.emit("joinRoom-request", data)
                socket.on("joinRoom-response", (res) => {
                    if(res) {
                        ipcRenderer.send("store-roomData-session-request", {
                            uid: val.uid,
                            name: val.name,
                            max: val.max,
                            current: val.current,
                            owner: val.owner
                        })
                        location.replace("index.html")
                    } else {
                        alert("To many players!")
                    }
                })
            })
        })
    })
}

getRoomData()

reloadBtn.addEventListener("click", () => {
    getRoomData()
})

createBtn.addEventListener("click", () => {
    const roomName = (document.getElementById("name") as HTMLInputElement).value
    const roomPassword = (document.getElementById("password") as HTMLInputElement).value
    const data = {roomName, roomPassword, userSession}
    socket.emit("createRoom-request", data)
    socket.on("createRoom-response", (res) => {
        if(res.verifit) {
            const roomData = {
                uid: res.uid,
                name: roomName,
                max: 5,
                current: 1,
                owner: userSession.id
            }
            ipcRenderer.send("store-roomData-session-request", roomData)
            ipcRenderer.on("store-roomData-session-response", () => {
                location.replace("index.html")
            })
        } else {
            alert("Name of room must be no space and 1~20 letter and password must be 0~8 letter")
        }
    })
})