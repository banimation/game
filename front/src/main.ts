const startBtn = document.getElementById("start") as HTMLInputElement

startBtn.addEventListener('click', () => {
    const nickName = document.getElementById("nickName") as HTMLInputElement
    const data = { nickName: nickName.value }
    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type" : "application/json"
        },
        body: JSON.stringify(data)
    })
    console.log("aa")
})