const express = require("express")
const multer = require("multer")
const path = require("path")
const http = require("http")
const socketIO = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = socketIO(server)

server.listen(3000)

app.use(express.static(path.join(__dirname, "public")))
app.use("/uploads", express.static("uploads"))

const images = ["image/jpg", "image/jpeg", "image/png"]

const storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads")
    },
    filename: (req, file, cb) => {        
        if(!images.includes(file.mimetype)) {
            return cb(new Error("Formato de imagem precisa ser do tipo JPG ou PNG"))
        }
        cb(null, `${Date.now()}--${file.originalname}`)
    },
})

const upload = multer({
    storage: storageEngine,
    limits: { fileSize: 1000000 }
})

app.post("/upload", upload.single("picture"), (req, res, next) => {
    try {        
        if(req.file) {            
            res.status(200).send({
                urlfile: req.file.filename
            })
        }
    }
    catch(err) {
        console.log(err)
    }
})

let connectedUsers = []
const maxUsers = 20

io.on("connection", (socket) => {
    
    socket.on("join-request", (username) => {
        let usedNick = false
        connectedUsers.forEach(users => {
            if(users.nick.toUpperCase() === username.toUpperCase()) {
                usedNick = true;
                return
            }
        })
        if(!usedNick) {
            if(connectedUsers.length > maxUsers) {
                socket.emit("user-notok", "A sala está lotada")
                return
            }
            socket.username = username
            socket.id = socket.id
            let user = {
                id: socket.id,
                nick: username
            }
            connectedUsers.push(user)
            socket.emit("user-ok", connectedUsers)
            socket.broadcast.emit("list-update", {
                joined: username,
                list: connectedUsers
            })
        }
        else {
            socket.emit("user-notok", "Esse apelido já está sendo utilizado no chat")
        }
    })

    socket.on("disconnect", () => {
        connectedUsers = connectedUsers.filter(u => u.nick != socket.username)
        socket.broadcast.emit("list-update", {
            left: socket.username,
            list: connectedUsers
        })
    })

    socket.on("send-msg", (txt, idSelect, image) => {
        let obj = {
            username: socket.username,
            message: txt,
            img: image
        }
        if(idSelect !== null && image === null) {
            obj.message = "(reservadamente) " + obj.message
        }
        if(idSelect !== null) {
            socket.to(idSelect).emit("show-msg", obj)
            io.to(socket.id).emit("show-msg", obj)
        }
        else {
            socket.emit("show-msg", obj)
            socket.broadcast.emit("show-msg", obj)
        }
    })

})