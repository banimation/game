import express from 'express'
import { createServer } from 'node:http';
import * as path from "node:path"
import { Server } from "socket.io"
import * as mysql from "mysql"
import { password } from "../ignore/mysql/config.json"
import { secret } from "../ignore/session/config.json"
import session from 'express-session'


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

type Entity = {
    x: number,
    y: number,
    w: number,
    h: number
}

playersDB.connect()
roomsDB.connect()

type userData = {uid: number, id: string, password: string}
type roomData = {uid: number, name: string, pw: string, max: number, current: number, owner: string}

const rooms = new Map()

const app = express()
const server = createServer(app)
const io = new Server(server);

app.use(express.urlencoded({ extended: false }), express.json())

app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: true
}))

declare module 'express-session' {
    interface SessionData {
        uuid: number
        uid: string
        roomName: string
    }
}

app.get("/", (req, res) => {
    if(!(req.session.uid) && !(req.session.uuid)) {
        res.sendFile(path.join(__dirname, "../../front/public/html/login.html"))
    } else {
        res.redirect("/room")
    }
    
})
app.get("/signUp", (_req, res) => {
    res.sendFile(path.join(__dirname, "../../front/public/html/signUp.html"))
})
app.get("/room", (req, res) => {
    if(!(req.session.uid) && !(req.session.uuid)) {
        res.redirect("/")
    } else {
        res.sendFile(path.join(__dirname, "../../front/public/html/room.html"))
    }
})
let roomName: string
app.get("/game/:name", (req, res) => {
    if(req.session.roomName) {
        roomName = req.session.roomName
    }
    res.sendFile(path.join(__dirname, "../../front/public/html/index.html"))
    
})

app.post("/login", (req, res) => {
    const id: string = req.body.id
    const pw: string = req.body.pw
    playersDB.query(`SELECT * FROM topic;`, (err: Error, result: Array<userData>) => {
        if(err) {
            throw err
        }
        let verifit = false
        const userAcc = result.filter(data => data.id === id)
        if(userAcc.length === 1) {
            if(userAcc[0].password === pw) {
                verifit = true
            }
        }
        if(verifit) {
            if(!(req.session.uid) && !(req.session.uuid)) {
                req.session.uuid = userAcc[0].uid
                req.session.uid = userAcc[0].id
            }
            res.json({respone: "succeeded", redirectURL: `/room`})
        } else {
            res.json({respone: "faild", redirectURL: ""})
        }
    })
})
app.post("/signUp", (req, res) => {
    const id: string = req.body.id
    const pw: string = req.body.pw
    if((id.length <= 12 && id.length >= 3) && (pw.length <= 20 && pw.length >= 8)) {
        playersDB.query(`SELECT * FROM topic;`, (err: Error, result: Array<userData>) => {
            if(err) {
                throw err
            }
            const userAcc = result.filter(data => data.id === id)
            if(userAcc.length < 1) {
                playersDB.query(`INSERT INTO topic (id, password) VALUES(?, ?);`, [id, pw], (err, _result) => {
                    if(err) {
                        throw err
                    }
                    res.json({respone: "succeeded", redirectURL: `/`})
                })
            } else {
                res.json({respone: "idIsExist", redirectURL: ``})
            }
        })
    } else {
        res.json({respone: "numberOfCharErr", redirectURL: ``})
    }
})
app.post("/getId", (req, res) => {
    res.json({id: req.session.uid})
})
app.post("/createRoom", async (req, res) => {
    const roomName = req.body.roomName
    const roomPassword = req.body.roomPassword
    roomsDB.query(`INSERT INTO topic (name, pw, max, current, owner) VALUES(?, ?, ?, ?, ?)`, [roomName, roomPassword, 4, 1, req.session.uid],(err, _result) => {
        if(err) {
            throw err
        }
        req.session.roomName = roomName
        res.json({redirectURL: `/game/${roomName}`})
    })
})

io.on('connection', (socket) => {
    if(roomName) {
        rooms.set(roomName, new Map())
        const players = rooms.get(roomName)
        socket.emit("playerJoin", {roomName, id: socket.id})
        socket.on("created", (value) => {
            socket.join(roomName)
            players.set(socket.id, value)
            players.forEach((value: {roomName: string, player: {id: string, data:Entity, color: string}}) => {
                socket.to(value.roomName).emit("otherPlayerData", value.player)
            })
            console.log(socket.id, "joined!", players.size)
        })
    
        socket.on("userData", (value) => {
            players.set(socket.id, value.player)
            socket.broadcast.to(value.roomName).emit("otherPlayer", players.get(socket.id))
        })
    
        socket.on('disconnect', () => {
            players.delete(socket.id)
            socket.broadcast.to(roomName).emit("playerLeave", socket.id)
            socket.leave(roomName)
            console.log(socket.id, "left!", players.size)
        })
    }
})

// io.on('connection', (socket) => {
//     socket.emit("playerJoin", socket.id)
//     socket.on("created", (value) => {
//         players.set(socket.id, value)
//         players.forEach((value, _k) => {
//             socket.emit("otherPlayerData", value)
//         })
//         console.log(socket.id, "joined!", players.size)
//     })

//     socket.on("userData", (value) => {
//         players.set(socket.id, value)
//         socket.broadcast.emit("otherPlayer", players.get(socket.id))
//     })

//     socket.on('disconnect', () => {
//         players.delete(socket.id)
//         socket.broadcast.emit("playerLeave", socket.id)
//         console.log(socket.id, "left!", players.size)
//     })
// });

app.use(express.static(`${__dirname}/../../front/public`))

server.listen(80, () => { // 참고 https://whatsmyinterest.tistory.com/25
    console.log("언빡")
})