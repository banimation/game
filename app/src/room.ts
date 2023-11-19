import { io } from "socket.io-client"

const socket = io("http://localhost:3000")

const userName = document.getElementById("welcome") as HTMLElement
const createBtn = document.getElementById("createBtn") as HTMLInputElement
const reloadBtn = document.getElementById("reloadBtn") as HTMLElement
const roomList = document.getElementById("roomList") as HTMLElement

interface roomData {
    uid: number
    name: string
    max: number
    current: number
    owner: string
}

socket.emit("getId-request")
socket.on("getId-response", (res) => {
    userName.innerText = `Welcome! ${res}`
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
    const data = {roomName, roomPassword}
    socket.emit("createRoom-request", data)
    socket.on("createRoom-response", (res) => {
        if(res) {
            location.replace("index.html")
        } else {
            alert("Name of room must be no space and 1~20 letter and password must be 0~8 letter")
        }
    })
})