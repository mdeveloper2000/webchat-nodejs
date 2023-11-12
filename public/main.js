const socket = io()

let username = ""
let userList = []
let idSelected = null

let nickInput = document.querySelector("#nickInput")
let loginBtn = document.querySelector("#loginBtn")
let messageInput = document.querySelector("#messageInput")
let namesList = document.querySelector(".userList")
let fileSend = document.querySelector("#fileSend")
let toast = document.querySelector("#liveToast")

fileSend.addEventListener("click", () => {
    if(idSelected === null) {
        let msg = document.querySelector(".toast-body")
        msg.innerHTML = "Selecione alguém antes de enviar a imagem"
        var toastElList = [].slice.call(document.querySelectorAll(".toast"))
        var toastList = toastElList.map(function(toastEl) {
            return new bootstrap.Toast(toastEl)
        })
        toastList.forEach(toast => toast.show())
    }
    else {
        let formData = new FormData();
        let picture = document.querySelector("#picture")
        formData.append("picture", picture.files[0])
        fetch("/upload", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(response => {
            socket.emit("send-msg", response.urlfile, idSelected, "img")
        })
    }
})

namesList.addEventListener("click", (e) => {
    idSelected = e.target.id
    let selecionado = e.target.innerHTML.trim()
    if(selecionado === username + " (Eu)") {
        let listItems = document.querySelectorAll(".userList li")
        for(let i = 0; i < listItems.length; i++) {
            listItems[i].classList.remove("border-light", "text-bg-success")
            listItems[i].classList.add("text-bg-success")
        }
        idSelected = null
        messageInput.placeholder = "Digite a mensagem e pressione ENTER (a mensagem será enviada para toda a sala)"
        return
    }
    else {
        let listItems = document.querySelectorAll(".userList li")
        for(let i = 0; i < listItems.length; i++) {
            listItems[i].classList.remove("text-bg-success", "border-light")
        }
        e.target.classList.add("text-bg-success", "border-light")
        messageInput.placeholder = `Digite a mensagem reservada para ( ${selecionado.trim()} ) e pressione ENTER`
        messageInput.focus()
    }
})


loginBtn.addEventListener("click", () => {
    const nick = nickInput.value.trim()
    if(nick != "") {
        username = nick
        socket.emit("join-request", username)
    }
    else {
        const message = document.querySelector("#message")
        const alert = document.querySelector(".alert")
        message.textContent = "Escolha um apelido"
        alert.style.display = "block"        
        nickInput.focus()
    }
})

messageInput.addEventListener("keyup", (e) => {
    if(e.keyCode === 13) {
        let txt = messageInput.value.trim()
        messageInput.value = ""
        if(txt != "") {
            socket.emit("send-msg", txt, idSelected, null)
            messageInput.focus()
        }
    }
})

function addMessage(type, user, msg) {
    let ul = document.querySelector(".chatList")
    switch(type) {
        case "status":
            ul.innerHTML += `<li class="list-group-item bg-primary text-white fw-bold fst-italic mt-1 mb-1">${msg}</li>`
        break
        case "exit":
            ul.innerHTML += `<li class="list-group-item bg-danger text-white fw-bold fst-italic mt-1 mb-1">${msg}</li>`
        break
        case "msg":
            if(username == user) {
                ul.innerHTML += `<li class="list-group-item bg-success text-white fw-bold mt-1 mb-1"><b>${user}:</b> ${msg}</li>`
            }
            else {
                ul.innerHTML += `<li class="list-group-item bg-warning text-dark fw-bold mt-1 mb-1"><b>${user}:</b> ${msg}</li>`
            }
        break
        case "img":
            if(username == user) {
                ul.innerHTML += `<li class="list-group-item bg-success text-white fw-bold mt-1 mb-1">
                    <b>${user}: </b>(reservadamente)<br /><img src="http://localhost:3000/uploads/${msg}" class="img-fluid" />
                </li>`
            }
            else {
                ul.innerHTML += `<li class="list-group-item bg-warning text-dark fw-bold mt-1 mb-1">
                    <b>${user}: </b>(reservadamente)<br /><img src="http://localhost:3000/uploads/${msg}" class="img-fluid" />
                </li>`
            }
        break
    }
    setTimeout(() => {
        ul.scrollTop = ul.scrollHeight
    }, 500)
}

function renderUserList() {
    let ul = document.querySelector(".userList")
    ul.innerHTML = ""
    userList.forEach(user => {
        if(user.nick === username) {
            user.nick += " (Eu)"
        }
        ul.innerHTML += `<li class="list-group-item fw-bold text-bg-primary" id="${user.id}">
            ${user.nick}
        </li>`
    })
}

socket.on("user-ok", (list) => {
    userList = list
    let dismiss = document.getElementById("dismiss")
    dismiss.click()
    renderUserList()
    addMessage("status", null, "Você se conectou ao chat...")
    messageInput.disabled = false
    messageInput.focus()
})

socket.on("user-notok", (msg) => {
    let message = document.querySelector("#message")
    let alert = document.querySelector(".alert")
    message.textContent = msg
    alert.style.display = "block"
})

socket.on("list-update", (data) => {
    if(data.joined) {
        addMessage("status", null, data.joined + " entrou no chat...")
    }
    if(data.left) {
        addMessage("exit", null, data.left + " saiu no chat...")
    }
    userList = data.list
    renderUserList()
})

socket.on("show-msg", (data) => {
    if(data.img === null) {
        addMessage("msg", data.username, data.message)
    }
    else {
        addMessage("img", data.username, data.message)
    }
})

socket.on("disconnect", () => {
    addMessage("exit", null, "Você está desconectado do chat")
    userList = []
    renderUserList()
})

socket.on("reconnect_error", () => {
    addMessage("status", null, "Tentando reconectar ao chat...")
})

socket.on("reconnect", () => {
    addMessage("status", null, "Você foi reconectado ao chat")
    if(username != "") {
        socket.emit("join-request", username)
    }
})