import express from 'express'
import { createServer } from 'node:http';
import * as path from "node:path"
import { Server } from "socket.io"

const app = express()
const server = createServer(app)
const io = new Server(server);

const players = new Map()

app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "../../front/public/html/index.html"))
})

io.on('connection', (socket) => {
    socket.emit("playerJoin", socket.id)
    socket.on("created", (value) => {
        players.set(socket.id, value)
        players.forEach((value, _k) => {
            socket.emit("otherPlayerData", value)
        })
        console.log(socket.id, "joined!", players.size)
    })

    socket.on("userData", (value) => {
        players.set(socket.id, value)
        socket.broadcast.emit("otherPlayer", players.get(socket.id))
    })

    socket.on('disconnect', () => {
        players.delete(socket.id)
        socket.broadcast.emit("playerLeave", socket.id)
        console.log(socket.id, "left!", players.size)
    })
});

app.use(express.static(`${__dirname}/../../front/public`))

server.listen(80, () => { // 참고 https://whatsmyinterest.tistory.com/25
    console.log("언빡")
})