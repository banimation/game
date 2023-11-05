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

type players = {
    id: string, 
    data:Entity, 
    color: string, 
    name: string
}

playersDB.connect()
roomsDB.connect()

type accData = {uid: number, id: string, password: string}
type roomData = {uid: number, name: string, pw: string, max: number, current: number, owner: string}

const rooms = new Map<string, Map<string, players>>()

const app = express()
const server = createServer(app)
const io = new Server(server);

const pattern = /\s/g

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
        roomUid: number
    }
}

roomsDB.query(`TRUNCATE topic;`, (err, _result) => {
    if(err) {
        throw err
    }
})

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
let roomUid: number
let uid: string
let uuid: number
app.get("/game/:name", (req, res) => {
    if(req.session.roomName && req.session.roomUid && req.session.uid && req.session.uuid) {
        roomName = req.session.roomName
        roomUid = req.session.roomUid
        uid = req.session.uid
        uuid = req.session.uuid
    }
    roomsDB.query(`SELECT * FROM topic WHERE uid=?`, [req.session.roomUid], (err, result) => {
        if(err) {
            throw err
        }
        if(result.length !== 0) {
            res.sendFile(path.join(__dirname, "../../front/public/html/index.html"))
        } else {
            res.redirect("/")
        }
    })
    
    
    
})

app.post("/login", (req, res) => {
    const id: string = req.body.id
    const pw: string = req.body.pw
    playersDB.query(`SELECT * FROM topic;`, (err: Error, result: Array<accData>) => {
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
            res.json({response: "succeeded", redirectURL: `/room`})
        } else {
            res.json({response: "faild", redirectURL: ""})
        }
    })
})
app.post("/signUp", (req, res) => {
    const id: string = req.body.id
    const pw: string = req.body.pw
    if((id.length <= 12 && id.length >= 3) && (pw.length <= 20 && pw.length >= 8)) {
        if(!(id.match(pattern))) {
            playersDB.query(`SELECT * FROM topic;`, (err: Error, result: Array<accData>) => {
                if(err) {
                    throw err
                }
                const userAcc = result.filter(data => data.id === id)
                if(userAcc.length < 1) {
                    playersDB.query(`INSERT INTO topic (id, password) VALUES(?, ?);`, [id, pw], (err, _result) => {
                        if(err) {
                            throw err
                        }
                        res.json({response: "succeeded", redirectURL: `/`})
                    })
                } else {
                    res.json({response: "idIsExist", redirectURL: ``})
                }
            })
        } else {
            res.json({response: "numberOfCharErr", redirectURL: ``})
        }
    } else {
        res.json({response: "numberOfCharErr", redirectURL: ``})
    }
})
app.post("/getId", (req, res) => {
    res.json({id: req.session.uid})
})
app.post("/getRooms", (_req, res) => {
    roomsDB.query(`SELECT * FROM topic;`, (err: Error, result: Array<roomData>) => {
        if(err) {
            throw err
        }
        const data: Array<{uid: number, name: string, max: number, current: number, owner: string}> = []
        result.forEach((value) => {
            data.push({uid: value.uid, name: value.name, max: value.max, current: value.current, owner: value.owner})
        })
        res.json({roomData: data})
    })
})
app.post("/joinRoom", (req, res) => {
    const roomName = req.body.roomName
    const roomUid = req.body.roomUid
    roomsDB.query(`SELECT * FROM topic WHERE uid=?;`, [req.body.roomUid], (err, result) => {
        if(err) {
            throw err
        }
        const roomData: roomData = result[0]
        if(roomData.current < roomData.max) {
            req.session.roomName = roomName
            req.session.roomUid = roomUid
            roomsDB.query(`UPDATE topic SET current=? WHERE uid=?;`, [roomData.current + 1, roomData.uid], (err, _result) => {
                if(err) {
                    throw err
                }
            })
            res.json({response: "succeeded", redirectURL: `/game/${req.session.roomName}`})
        } else {
            res.json({response: "faild", redirectURL: ``})
        }
        
    })
    
})
app.post("/createRoom", async (req, res) => {
    const roomName:string = req.body.roomName
    const roomPassword:string = req.body.roomPassword
    if((roomName.length <= 20 && roomName.length >= 1) && (roomPassword.length <= 8 && roomPassword.length >= 0)) {
        if(!(roomName.match(pattern))) {
            roomsDB.query(`INSERT INTO topic (name, pw, max, current, owner) VALUES(?, ?, ?, ?, ?)`, [roomName, roomPassword, 5, 1, req.session.uid],(err, result) => {
                if(err) {
                    throw err
                }
                req.session.roomName = roomName
                req.session.roomUid = result.insertId
                rooms.set(String(req.session.roomUid), new Map<string, players>())
                res.json({response: "succeeded", redirectURL: `/game/${roomName}`})
            })
        } else {
            res.json({response: "faild", redirectURL: ``})
        }
    } else {
        res.json({response: "faild", redirectURL: ``})
    }
})

io.on('connection', (socket) => {
    if(roomName) {
        const joinedRoomName = roomName
        const joinedRoomUid = String(roomUid)
        const joinedUserId = uid
        const players: Map<string, players> = rooms.get(joinedRoomUid)!
        
        socket.emit("playerJoin", {socketId: socket.id, userId: joinedUserId})
        socket.on("created", (value) => {
            socket.join(joinedRoomUid)
            players.set(socket.id, value)
            players.forEach((value: players) => {
                socket.to(joinedRoomUid).emit("otherPlayerData", value)
            })
            console.log(`JOIN MESSAGE(roomName: ${joinedRoomName} / roomUid: ${joinedRoomUid} / socketID: ${socket.id} / userName: ${joinedUserId} / current: ${players.size})`)
        })
    
        socket.on("userData", (value) => {
            players.set(socket.id, value)
            socket.broadcast.to(joinedRoomUid).emit("otherPlayer", players.get(socket.id))
        })
    
        socket.on('disconnect', async () => {
            players.delete(socket.id)
            socket.broadcast.to(joinedRoomUid).emit("playerLeave", socket.id)
            socket.leave(joinedRoomUid)
            console.log(`LEFT MESSAGE(roomName: ${joinedRoomName} / uid: ${joinedRoomUid} / socketID: ${socket.id} / current: ${players.size})`)
            roomsDB.query(`SELECT * FROM topic WHERE uid=?;`, [joinedRoomUid], (err, result) => {
                if(err) throw err
                if(result.length !== 0) {
                    const roomData: roomData = result[0]
                    roomsDB.query(`UPDATE topic SET current=? WHERE uid=?;`, [roomData.current - 1, roomData.uid], (err, _result) => {
                        if(err) throw err
                    })
                }
            })
            if(players.size === 0) {
                roomsDB.query(`DELETE FROM topic WHERE uid=?`, [joinedRoomUid], (err, _result) => {
                    if(err) {
                        throw err
                    }
                })
            }
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