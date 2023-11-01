const createBtn = document.getElementById("createBtn") as HTMLInputElement

createBtn.addEventListener("click", () => {
    const roomName = (document.getElementById("name") as HTMLInputElement).value
    const roomPassword = (document.getElementById("password") as HTMLInputElement).value
    const data = {roomName, roomPassword}
    console.log(window.location)
    fetch(`/createRoom`, {
        method: "POST",
        headers: {
            "Content-Type" : "application/json"
        },
        body: JSON.stringify(data)
    }).then(res => res.json).then(_data => {
        
    })
})