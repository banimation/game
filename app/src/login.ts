import { io } from "socket.io-client"


const socket = io("http://localhost:3000")

const loginBtn = document.getElementById("login") as HTMLInputElement
loginBtn.addEventListener('click', () => {
    const id = (document.getElementById("id") as HTMLInputElement).value
    const pw = (document.getElementById("password") as HTMLInputElement).value
    const data = { id, pw }
    socket.emit("login-request", data)
    socket.on("login-response", (res) => {
        if(res) {
            location.href = "room.html"
        } else {
            alert("faild login, check your Id and Password")
        }
    })
})