const createBtn = document.getElementById("createBtn") as HTMLInputElement

const userName = document.getElementById("welcome") as HTMLElement

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
    }).then(res => res.json()).then((data: {redirectURL: string}) => {
        if(data) {
            location.replace(data.redirectURL)
        }
    })
})