import { io } from "socket.io-client"
import { ipcRenderer } from "electron"

const socket = io("http://localhost:3000")

const userName = document.getElementById("welcome")!
const createBtn = document.getElementById("createBtn") as HTMLInputElement
const reloadBtn = document.getElementById("reloadBtn")!
const roomList = document.getElementById("roomList")!
const playBtn = document.getElementById("play")!
const mainContainer = document.getElementById("main-container")!
const roomContainer = document.getElementById("room-container")!
const roomBack = document.getElementById("room-back")!

const bg = document.getElementById("bg")!
const shadow = document.getElementById("shadow")!

const wait = (time: number) => {
    return new Promise((res) => {
        setTimeout(() => {
            res("")
        }, time * 1000)
    })
}
const lightning1 = new Audio(`../texture/lightning-1.mp3`)
const lightning2 = new Audio(`../texture/lightning-2.mp3`)
const rain = new Audio(`../texture/rain.mp3`)
lightning1.volume = 0.4
rain.volume = 0.4
lightning2.volume = 0.7
rain.loop = true
rain.play()
const lightning = async () => {
    while(true) {
        await wait(8)
        if(Math.floor(Math.random() * 2) + 1 === 1) {
            lightning1.play()
        } else {
            lightning2.play()
        }
        bg.style.filter = "brightness(6)"
        shadow.style.opacity = "1"
        await wait(0.05)
        bg.style.filter = "brightness(3)"
        shadow.style.opacity = "0.5"
        await wait(0.05)
        bg.style.filter = "brightness(4)"
        shadow.style.opacity = "0.7"
        await wait(0.05)
        bg.style.filter = "brightness(5)"
        shadow.style.opacity = "0.9"
        await wait(0.05)
        bg.style.filter = "brightness(6)"
        shadow.style.opacity = "1"
        await wait(0.05)
        bg.style.filter = "brightness(3)"
        shadow.style.opacity = "0.5"
        await wait(0.05)
        bg.style.filter = "brightness(4)"
        shadow.style.opacity = "0.7"
        await wait(0.05)
        bg.style.filter = "brightness(5)"
        shadow.style.opacity = "0.9"
        await wait(0.05)
        bg.style.filter = "brightness(4)"
        shadow.style.opacity = "0.7"
        await wait(0.05)
        bg.style.filter = "brightness(3)"
        shadow.style.opacity = "0.5"
        await wait(0.05)
        bg.style.filter = "brightness(2)"
        shadow.style.opacity = "0.2"
        await wait(0.05)
        bg.style.filter = "brightness(1)"
        shadow.style.opacity = "0"
    }
}
lightning()
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