import express from 'express'
import { createServer } from 'node:http'
import { Server } from "socket.io"
import * as mysql from "mysql"
import { password } from "../ignore/mysql/config.json"

interface userSession {
    uid: number
    id: string
}

interface roomSession {
    uid: number
    name: string
    max: number
    current: number
    owner: string
}

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
    name: string,
    role: string
}

playersDB.connect()
roomsDB.connect()

type accData = {uid: number, id: string, password: string}
type roomData = {uid: number, name: string, pw: string, max: number, current: number, owner: string}

const rooms = new Map<string, Map<string, players>>()

const app = express()
const server = createServer(app)
const io = new Server(server).listen(3000)

const pattern = /\s/g

app.use(express.urlencoded({ extended: false }), express.json())


roomsDB.query(`TRUNCATE topic;`, (err, _result) => {
    if(err) {
        throw err
    }
})

interface acc {
    id: string;
    pw: string;
}

io.on('connection', (socket) => {
    socket.on("login-request", (req: acc) => {
        const id = req.id
        const pw = req.pw
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
            const sessionData = {
                uid: userAcc[0].uid,
                id: userAcc[0].id
            }
            socket.emit("login-response", {verifit, sessionData})
        })
    })

    socket.on("getRooms-request", (_req) => {
        roomsDB.query(`SELECT * FROM topic;`, (err: Error, result: Array<roomData>) => {
            if(err) {
                throw err
            }
            const data: Array<{uid: number, name: string, max: number, current: number, owner: string}> = []
            result.forEach((value) => {
                data.push({uid: value.uid, name: value.name, max: value.max, current: value.current, owner: value.owner})
            })
            socket.emit("getRooms-response", data)
        })
    })

    socket.on("joinRoom-request", (req) => {
        const roomName = req.roomName
        const roomUid = req.roomUid
        roomsDB.query(`SELECT * FROM topic WHERE uid=?;`, [roomUid], (err, result) => {
            if(err) {
                throw err
            }
            const roomData: roomData = result[0]
            if(roomData.current < roomData.max) {
                socket.emit("joinRoom-response", true)
            } else {
                socket.emit("joinRoom-response", false)
            }
            
        })
    })

    socket.on("createRoom-request", (req) => {
        const roomName:string = req.roomName
        const roomPassword:string = req.roomPassword
        const userSession = req.userSession
        if((roomName.length <= 20 && roomName.length >= 1) && (roomPassword.length <= 8 && roomPassword.length >= 0)) {
            if(!(roomName.match(pattern))) {
                roomsDB.query(`INSERT INTO topic (name, pw, max, current, owner) VALUES(?, ?, ?, ?, ?)`, [roomName, roomPassword, 5, 0, userSession.uid],(err, result) => {
                    if(err) {
                        throw err
                    }
                    rooms.set(String(result.insertId), new Map<string, players>())
                    socket.emit("createRoom-response", {verifit: true, uid: result.insertId})
                })
            } else {
                socket.emit("createRoom-response", {verifit: false})
            }
        } else {
            socket.emit("createRoom-response", {verifit: false})
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

io.on('connection', (socket) => {
    let joinedRoomName: any
    let joinedRoomUid: any
    let joinedUserName: any
    let players: Map<string, players>
        
    socket.on("player-join-request", (req) => {
        roomsDB.query(`SELECT * FROM topic WHERE uid=?;`, [joinedRoomUid!], (err, result) => {
            if(err) throw err
            if(result.length > 0) {
                const roomData: roomData = result[0]
                if(roomData.current < roomData.max) {
                    roomsDB.query(`UPDATE topic SET current=? WHERE uid=?;`, [roomData.current + 1, roomData.uid], (err, _result) => {
                        if(err) {
                            throw err
                        }
                    })
                }
            }
        })
        const userSession: userSession = req.userSession
        const roomSession: roomSession = req.roomSession
        joinedRoomName = roomSession.name
        joinedRoomUid = String(roomSession.uid)
        joinedUserName = userSession.id
        players = rooms.get(joinedRoomUid)!
        socket.emit("player-join-response", socket.id)
    })

    socket.on("created", (value) => {
        socket.join(joinedRoomUid!)
        players.set(socket.id, value)
        players.forEach((value: players) => {
            socket.to(joinedRoomUid!).emit("create-players", value)
        })
        console.log(`JOIN MESSAGE(roomName: ${joinedRoomName!} / roomUid: ${joinedRoomUid!} / socketID: ${socket.id} / userName: ${joinedUserName!} / current: ${players.size})`)
    })

    socket.on("update-user-data", (value) => {
        players.set(socket.id, value)
        socket.broadcast.to(joinedRoomUid!).emit("update-other-user-data", players.get(socket.id))
    })

    socket.on("start-request", (_req) => {
        const random = Math.floor(Math.random() * 5)
        const socketId = Array.from(players.keys())[random]
        const playerValue = players.get(socketId)!
        playerValue.role = "tagger"
        players.set(socketId, playerValue)
        socket.to(socketId).emit("you-are-tagger", players.get(socketId))
    })

    socket.on('disconnect', async () => {
        if(joinedRoomUid) {
            players.delete(socket.id)
            socket.broadcast.to(joinedRoomUid!).emit("playerLeave", socket.id)
            socket.leave(joinedRoomUid!)
            console.log(`LEFT MESSAGE(roomName: ${joinedRoomName!} / uid: ${joinedRoomUid!} / socketID: ${socket.id} / current: ${players.size})`)
            roomsDB.query(`SELECT * FROM topic WHERE uid=?;`, [joinedRoomUid!], (err, result) => {
                if(err) throw err
                if(result.length !== 0) {
                    const roomData: roomData = result[0]
                    roomsDB.query(`UPDATE topic SET current=? WHERE uid=?;`, [roomData.current - 1, roomData.uid], (err, _result) => {
                        if(err) throw err
                        joinedRoomUid = undefined
                        joinedRoomName = undefined
                        joinedUserName = undefined
                    })
                }
            })
            if(players.size === 0) {
                roomsDB.query(`DELETE FROM topic WHERE uid=?`, [joinedRoomUid!], (err, _result) => {
                    if(err) {
                        throw err
                    }
                })
            }
        }
    })
})
app.use(express.static(`${__dirname}/../../app/public`))