const startBtn = document.getElementById("login") as HTMLInputElement

// window.history.pushState("", "", '/')

startBtn.addEventListener('click', () => {
    const id = (document.getElementById("id") as HTMLInputElement).value
    const pw = (document.getElementById("password") as HTMLInputElement).value
    const data = { id, pw }
    if((id.length <= 11 && id.length >= 3) && (pw.length <= 20 && pw.length >= 8)) {
        fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify(data)
        }).then(res => res.json()).then(data => {
            console.log(data.respone)
            if(data) {
                location.replace(data.respone)
            }
        })
    } else {
        alert("id must be at least 3 char and password must be at least 8 char")
    }
})