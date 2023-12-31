const signUpBtn = document.getElementById("signUp") as HTMLInputElement

signUpBtn.addEventListener('click', () => {
    const id = (document.getElementById("id") as HTMLInputElement).value
    const pw = (document.getElementById("password") as HTMLInputElement).value
    const data = { id, pw }
    fetch("/signUp", {
        method: "POST",
        headers: {
            "Content-Type" : "application/json"
        },
        body: JSON.stringify(data)
    }).then(res => res.json()).then((data: {response: string, redirectURL: string}) => {
        if(data.response === "succeeded") location.replace(data.redirectURL)
        else if(data.response === "idIsExist") alert("exist Id")
        else if(data.response === "numberOfCharErr") alert("Id must be 3~12 letter and password must be 8~20 letter")
    })
})