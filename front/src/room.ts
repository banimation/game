const userName = document.getElementById("welcome") as HTMLElement
const createBtn = document.getElementById("createBtn") as HTMLInputElement
const reloadBtn = document.getElementById("reloadBtn") as HTMLElement
const roomList = document.getElementById("roomList") as HTMLElement

fetch(`/getId`, {
    method: "POST",
    headers: {
        "Content_Type" : "application/json"
    }
}).then(res => res.json()).then((data: {id: string}) => {
    if(data) {
        userName.innerText = `Welcome! ${data.id}`
    }
})

const getRoomData = () => {
    fetch(`/getRooms`, {
        method: "POST",
        headers: {
            "Content_Type" : "application/json"
        }
    }).then(res => res.json()).then((data) => {
        if(data) {
            roomList.replaceChildren()
            const roomData: Array<{uid: number, name: string, max: number, current: number, owner: string}> = data.roomData
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
                    fetch("/joinRoom", {
                        method: "POST",
                        headers: {
                            "Content-Type" : "application/json"
                        },
                        body: JSON.stringify(data)
                    }).then(res => res.json()).then((data: {response: string, redirectURL: string}) => {
                        if(data) {
                            if(data.response === "succeeded") {
                                location.replace(data.redirectURL)
                            } else {
                                alert("To many players!")
                            }
                        }
                    })
                })
            })
        }
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
    fetch(`/createRoom`, {
        method: "POST",
        headers: {
            "Content-Type" : "application/json"
        },
        body: JSON.stringify(data)
    }).then(res => res.json()).then((data: {response: string,redirectURL: string}) => {
        if(data) {
            if(data.response === "succeeded") {
                location.replace(data.redirectURL)
            } else {
                alert("Name of room must be no space and 1~20 letter and password must be 0~8 letter")
            }
        }
    })
})