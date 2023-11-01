import express from 'express'
import { createServer } from 'node:http';
import * as path from "node:path"
import { Server } from "socket.io"
import * as mysql from "mysql"
import { password } from "../mysql/config.json"

const playersDB = mysql.createConnection({ // 참조: https://stackoverflow.com/questions/50093144/mysql-8-0-client-does-not-support-authentication-protocol-requested-by-server
    host: "localhost",
    user: "root",
    password: password,
    database: "players"
})
const roomsDB = mysql.createConnection({ // 참조: https://stackoverflow.com/questions/50093144/mysql-8-0-client-does-not-support-authentication-protocol-requested-by-server
    host: "localhost",
    user: "root",
    password: password,
    database: "rooms"
})

playersDB.connect()
roomsDB.connect()

type userData = {uid: number, id: string, pw: string}
type roomData = {uid: number, name: string, pw: string, max: number, current: number, owner: string}

const app = express()
const server = createServer(app)
const io = new Server(server);

app.use(express.urlencoded({ extended: false }), express.json())

const players = new Map()

app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "../../front/public/html/main.html"))
})
app.post("/login", (req, res) => {
    const id: string = req.body.id
    const pw: string = req.body.pw
    if((id.length <= 11 && id.length >= 3) && (pw.length <= 20 && pw.length >= 8)) {
        playersDB.query(`INSERT INTO topic (id, pw) VALUES(?, ?);`, [id, pw], (err, result) => {
            if(err) {
                throw err
            }
            // res.json({respone: `/game/${result.insertId}`})
            res.json({respone: `/room/${result.insertId}`})
        })
    }
})
app.get("/game/:uid", (req, res) => {
    const params = req.params
    playersDB.query(`SELECT * FROM topic;`, (err: Error, result: Array<userData>) => {
        if(err) {
            throw err
        }
        let isNameExist = false
        result.forEach((data) => {
            if(data.uid === Number(params.uid)) {
                isNameExist = true
            }
        })
        if(isNameExist) {
            res.sendFile(path.join(__dirname, "../../front/public/html/index.html"))
        } else {
            res.sendFile(path.join(__dirname, "../../front/public/html/noExist.html"))
        }
    })
})
app.get("/room/:uid", (_req, res) => {
    res.sendFile(path.join(__dirname, "../../front/public/html/room.html"))
})

app.post("/createRoom/:uuid", async (req, _res) => {
    const uuid = req.params.uuid
    const roomName = req.body.roomName
    const roomPassword = req.body.roomPassword
    roomsDB.query(`INSERT INTO topic (name, pw, max, current, owner) VALUES(?, ?, ?, ?, ?)`, [roomName, roomPassword, 4, 1, uuid],(err, _result) => {
        if(err) {
            throw err
        }
        // res.json({respone: `/game`})
    })
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