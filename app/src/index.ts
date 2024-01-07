import { io } from "socket.io-client"
import { ipcRenderer } from "electron"
import Loader from "./lib/Loader"

const canvas = document.getElementById("canvas") as HTMLCanvasElement
const ctx = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D
const fogCanvas = document.getElementById("fog") as HTMLCanvasElement
const fog = fogCanvas.getContext("2d") as CanvasRenderingContext2D
const currentPlayer = document.getElementById("current-player") as HTMLElement
const start = document.getElementById("start") as HTMLElement
const option = document.getElementById("option") as HTMLElement
const optionBtn = document.getElementById("optionBtn") as HTMLImageElement
const leave = document.getElementById("leave") as HTMLElement

const walls = new Map<Wall, Wall>()
const players = new Map<string, Player>()
let camera: {x: number, y: number} = {x: 0, y: 0}
const playerInitData = {
    x: 1,
    y: 1,
    w: 50,
    h: 20
}

let socketId: string
let userName: string

const socket = io("http://localhost:3000")

type Axis = {x: number, y: number}
type EntityInitData = Axis & {w: number, h: number}

interface userSession {uid: number, id: string}
interface roomSession {
    uid: number
    name: string
    max: number
    current: number
    owner: string
}

let userSession: userSession
let roomSession: roomSession
// socket ==============================================================>
Loader.loadAll([
    "../texture/character/x50.png",
    "../texture/character/x100.png",
    "../texture/character/x200.png",
    "../texture/floor.png",
    "../texture/walls/wall-front.png",
    "../texture/walls/wall-back.png",
    "../texture/walls/wall-side.png",
    "../texture/clock/x100.png",
    "../texture/tile.png"
]).then(() => {
    ipcRenderer.send("session-request")
})
ipcRenderer.on("session-response", (_event, res) => {
    userSession = res.userData
    roomSession = res.roomData
    socket.emit("player-join-request", { userSession, roomSession })
})
socket.on("player-join-response", (res) => {
    socketId = res
    userName = userSession.id
    new Player(socketId, {x: 1, y: 1, w: playerInitData.w, h: playerInitData.h}, userName, "runner").create()
    socket.emit("created", players.get(socketId))
    RenderingEngine.init()
})
socket.on("create-players", (res) => {
    new Player(res.id, res, res.name, res.role).create()
})
socket.on("update-other-user-data", (res) => {
    players.set(res.id, new Player(res.id, res, res.name, res.role))
})
socket.on("playerLeave", (id) => {
    players.delete(id)
})
// socket ==============================================================>
const tileSize = 32
/** @deprecated */
function renderFloor(repeat: number) {
    for (let i = 0; i < repeat; i++) {
        for (let k = 0; k < repeat; k++) {
          ctx.drawImage(Loader.get("../texture/tile.png"), (k * tileSize + camera.x), (i * tileSize + camera.x))
        }
    }
}
function restoreIntersectionPoints(player: Player, rotateAngle: number) {
    RenderingEngine.rayPoints = []
    const r = 250
    const zeroPointAxis = {x: player.getAxis().x, y: player.getAxis().y - r}
    let axis = zeroPointAxis
    let updateAxis = {x: player.getAxis().x, y: player.getAxis().y - r}
    for(let n = 0; n < 360 / rotateAngle; n++) {
        for(let i = 0; i < RenderingEngine.rectLines.length; i++) {
            const x1 = player.getAxis().x
            const y1 = player.getAxis().y
            const x2 = axis.x
            const y2 = axis.y
            const x3 = RenderingEngine.rectLines[i].x1
            const y3 = RenderingEngine.rectLines[i].y1
            const x4 = RenderingEngine.rectLines[i].x2
            const y4 = RenderingEngine.rectLines[i].y2
            const determinedMatrix = (x2 - x1) * (y4 - y3) - (x4 - x3) * (y2 - y1)
            if(determinedMatrix === 0) {continue}
            const scala1 = (1 / determinedMatrix) * ((y3 - y4) * (x3 - x1) + (x4 - x3) * (y3 - y1)) * -1
            const scala2 = (1 / determinedMatrix) * ((y1 - y2) * (x3 - x1) + (x2 - x1) * (y3 - y1)) * -1
            if((scala1 < 1 && scala1 > 0) && (scala2 < 1 && scala2 > 0)) {
                const crossPointX = x1 + (x2 - x1) * scala1
                const crossPointY = y1 + (y2 - y1) * scala1
                if(Math.pow(updateAxis.x - player.getAxis().x, 2) + Math.pow(updateAxis.y - player.getAxis().y, 2) > Math.pow(crossPointX - player.getAxis().x, 2) + Math.pow(crossPointY - player.getAxis().y, 2)) {
                    updateAxis.x = crossPointX
                    updateAxis.y = crossPointY
                }
            }
        }
        RenderingEngine.rayPoints.push({x: updateAxis.x, y: updateAxis.y})
        const nextAxis = {
            x: ((axis.x - player.getAxis().x) * Math.cos(rotateAngle * Math.PI / 180) - (axis.y - player.getAxis().y) * Math.sin(rotateAngle * Math.PI / 180)) + player.getAxis().x, // + - 부호는 반대 왜냐하면 canvas는 왼쪽 상단이 0,0좌표
            y: ((axis.x - player.getAxis().x) * Math.sin(rotateAngle * Math.PI / 180) + (axis.y - player.getAxis().y) * Math.cos(rotateAngle * Math.PI / 180)) + player.getAxis().y
        }
        axis = nextAxis
        updateAxis.x = nextAxis.x
        updateAxis.y = nextAxis.y
    }
}

function renderPlayerSight(player: Player, axis: Array<Axis>, rotateAngle: number) {
    fog.save()
    fog.fillStyle = "black"
    fog.fillRect(0, 0, window.innerWidth, window.innerHeight)
    fog.restore()
    fog.save()
    fog.beginPath()
    for(let i = 0; i < axis.length; i++) {
        fog.fillStyle = "rgba(0,0,0,1)"
        fog.globalCompositeOperation = "destination-out"
        fog.moveTo(player.getAxis().x + camera.x, player.getAxis().y + camera.y)
        fog.lineTo(axis[i].x + camera.x, axis[i].y + camera.y)
        fog.lineTo(axis[i !== (360 / rotateAngle -1)? i+1 : 0].x + camera.x, axis[i !== (360 / rotateAngle -1) ? i+1 : 0].y + camera.y)
    }
    fog.fill()
    fog.closePath()
    walls.forEach((value, _key) => {
        fog.fillRect(value.x + camera.x, value.y + camera.y, value.w, value.h)
    })
    fog.restore()
}

function isEntityInSight(player: Player, entity: Player) {
    const rayPoints = RenderingEngine.rayPoints
    let isInEyelight = false
    for(let n = 0; n < rayPoints.length; n++) {
        for(let i = 0; i < entity.getLine().length; i++) {
            const x1 = player.getAxis().x
            const y1 = player.getAxis().y
            const x2 = rayPoints[n].x
            const y2 = rayPoints[n].y
            const x3 = entity.getLine()[i].x1
            const y3 = entity.getLine()[i].y1
            const x4 = entity.getLine()[i].x2
            const y4 = entity.getLine()[i].y2
            const determinedMatrix = (x2 - x1) * (y4 - y3) - (x4 - x3) * (y2 - y1)
            if(determinedMatrix === 0) {continue}
            const scala1 = (1 / determinedMatrix) * ((y3 - y4) * (x3 - x1) + (x4 - x3) * (y3 - y1)) * -1
            const scala2 = (1 / determinedMatrix) * ((y1 - y2) * (x3 - x1) + (x2 - x1) * (y3 - y1)) * -1
            if((scala1 < 1 && scala1 > 0) && (scala2 < 1 && scala2 > 0)) {
                isInEyelight = true
            }
        }
    }
    return isInEyelight
}
const moveSpeed = 4
let collisionDetection = {left: true, down: true, right: true, up: true}
function detectCollision(player: Player, rect: Wall) {
    let left = true
    let down = true
    let right = true
    let up = true
    const vx = player.getAxis().x - rect.getAxis().x
    const vy = player.getAxis().y - rect.getAxis().y
    const colliedX = player.w / 2 + rect.w / 2
    const colliedY = player.h / 2 + rect.h / 2
    if(player.x + player.w <= rect.x && (player.y + player.h > rect.y && player.y < rect.y + rect.h))  {
        if(Math.abs(vx) <= colliedX) {
            if(vx < 0) {
                right = false
            }
        }
    }
    if(player.x + player.w >= rect.x && (player.y + player.h > rect.y && player.y < rect.y + rect.h)) {
        if(Math.abs(vx) <= colliedX) {
            if(vx > 0) {
                if(collisionDetection.left) {
                    left = false
                }
                
            }
        }
    }
    if(player.y + player.h <= rect.y && (player.x < rect.x + rect.w && player.x + player.w > rect.x)) {
        if(Math.abs(vy) <= colliedY) {
            if(vy < 0) {
                down = false
            }
        }
    }
    if(player.y + player.h >= rect.y && (player.x < rect.x + rect.w && player.x + player.w > rect.x)) {
        if(Math.abs(vy) <= colliedY) {
            if(vy > 0) {
                up = false
            }
        }
    }
    if(!collisionDetection.right) {
        right = collisionDetection.right
    }
    if(!collisionDetection.left) {
        left = collisionDetection.left
    }
    if(!collisionDetection.down) {
        down = collisionDetection.down
    }
    if(!collisionDetection.up) {
        up = collisionDetection.up
    }
    collisionDetection = {left, down, right, up}
}

class Entity {
    x: number
    y: number
    h: number
    w: number
    constructor(initData: EntityInitData) {
        this.x = initData.x
        this.y = initData.y
        this.h = initData.h
        this.w = initData.w
    }
    getAxis() {
        const axis = {
            x: (this.x + this.w / 2),
            y: (this.y + this.h / 2)
        }
        return axis
    }
    getLine() {
        const lines = [
            new Line({x: this.x, y: this.y}, {x: this.x, y: (this.y + this.h)}),
            new Line({x: this.x, y: (this.y + this.h)}, {x: (this.x + this.w), y: (this.y + this.h)}),
            new Line({x: (this.x + this.w), y: (this.y + this.h)}, {x: (this.x + this.w), y: this.y}),
            new Line({x: (this.x + this.w), y: this.y}, {x: this.x, y: this.y})
        ]
        return lines
    }
}
const playerImageSize = 100
class Player extends Entity {
    id: string
    name: string
    role: string
    constructor(id: string, initData: EntityInitData, name: string, role: string) {
        super(initData)
        this.id = id
        this.name = name
        this.role = role
    }
    create() {
        ctx.save()
        ctx.fillStyle = "black";
        ctx.fillRect(this.x + camera.x, this.y + camera.y, this.w, this.h)
        ctx.font = "20px sans-serif"
        ctx.textAlign = "left"
        if(this.role === "runner") {
            ctx.fillStyle = "black";
        } else {
            ctx.fillStyle = "red";
        }
        // ctx.fillText(this.name, this.x + camera.x, this.y + camera.y + playerImageSize/2 + 20)
        ctx.restore()
        ctx.drawImage(Loader.get(`../texture/character/x${playerImageSize}.png`), this.x - 25 + camera.x, this.y - 60 + camera.y)
        players.set(this.id, this)
    }
    move(direction: string) {
        if(direction === "left") {
            this.x -= 1
        } else if(direction === "down") {
            this.y += 1
        } else if(direction === "right") {
            this.x += 1
        } else if(direction === "up") {
            this.y -= 1
        }
    }
}
class Wall extends Entity {
    direction: string
    constructor(initData: EntityInitData, direction?: string) {
        super(initData)
        this.direction = "front"
        if(direction) {
            this.direction = direction
        }
    }
    create() {
        // 여기 나중에 최적화를 위해서 다 갈아엎어야함
        ctx.fillStyle = "black"
        ctx.fillRect(this.x + camera.x, this.y + camera.y, this.w, this.h)
        ctx.drawImage(Loader.get(`../texture/walls/wall-${this.direction}.png`), this.x + camera.x, this.y + camera.y, this.w, this.h)
        // ctx.drawImage(Loader.get(`../texture/clock/x100.png`), this.x + camera.x, this.y + camera.y, this.w, this.h)
        RenderingEngine.rectVertexes.push(
            {x: this.x, y: this.y},
            {x: this.x, y: (this.y + this.h)},
            {x: (this.x + this.w), y: (this.y + this.h)},
            {x: (this.x + this.w), y: this.y}
        )
        RenderingEngine.rectLines.push(
            new Line({x: this.x, y: this.y}, {x: this.x, y: (this.y + this.h)}),
            new Line({x: this.x, y: (this.y + this.h)}, {x: (this.x + this.w), y: (this.y + this.h)}),
            new Line({x: (this.x + this.w), y: (this.y + this.h)}, {x: (this.x + this.w), y: this.y}),
            new Line({x: (this.x + this.w), y: this.y}, {x: this.x, y: this.y}),
        )
        walls.set(this, this)
    }
}
class Line {
    x1: number
    y1: number
    x2: number
    y2: number
    constructor(p1: Axis, p2: Axis) {
        this.x1 = p1.x
        this.y1 = p1.y
        this.x2 = p2.x
        this.y2 = p2.y
    }
}

function playerToCenter(player: Player) {
    const x = window.innerWidth / 2 - player.getAxis().x
    const y = window.innerHeight / 2 - player.getAxis().y
    camera = {x, y}
    // camera = {x: 0, y: 0}
}

// @lotinex
class Rect {
    constructor(
        public x: number, 
        public y: number, 
        public endX: number, 
        public endY: number
    ){}
    isOverlappedWith(rect: Rect){
        const p1 = new Point2D(this.x, this.y)
        const p2 = new Point2D(this.endX, this.y)
        const p3 = new Point2D(this.x, this.endY)
        const p4 = new Point2D(this.endX, this.endY)

        return p1.checkInRect(rect) || p2.checkInRect(rect) || p3.checkInRect(rect) || p4.checkInRect(rect)
    }
}
class Point2D {
    constructor(public x: number, public y: number){}
    checkInRect(rect: Rect){
        return (
            this.x >= rect.x && this.x <= rect.endX && this.y >= rect.y && this.y <= rect.endY
        )
    }
}
class Chunk extends Rect {
    private entities: Array<Renderable> = []
    constructor(
        x: number, 
        y: number, 
        endX: number, 
        endY: number
    ){
        super(x, y, endX, endY)
    }
    add(...entities: Array<Renderable>){
        this.entities = [...this.entities, ...entities]
    }
    render(ctx: CanvasRenderingContext2D){
        for(const entity of this.entities){
            entity.render(ctx)
        }
    }
    shouldRendered(player: Player){
        const pos = player.getAxis()
        const screen = new Rect(pos.x - window.innerWidth / 2, pos.y - window.innerHeight / 2, pos.x + window.innerWidth / 2, pos.y + window.innerHeight / 2)

        return screen.isOverlappedWith(this) || this.isOverlappedWith(screen)
    }
}

abstract class Renderable {
    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number,
        public texture: HTMLImageElement
    ){}
    abstract render(ctx: CanvasRenderingContext2D): void
}
class Tile extends Renderable {
    constructor(x: number, y: number){
        super(x, y, tileSize, tileSize, Loader.get("../texture/tile.png"))
    }
    render(ctx: CanvasRenderingContext2D): void {
        ctx.drawImage(this.texture, this.x + camera.x, this.y + camera.y, this.width, this.height)
    }
}
// @lotinex-end

let then: number = window.performance.now()
// engine ================================================================>
class RenderingEngine {
    static rectLines: Array<Line> = []
    static rectVertexes: Array<Axis> = []
    static rayPoints: Array<Axis> = []
    static entitiesToRender = new Map<string, Player>()
    static rotateAngle: number = 1

    // @lotinex
    static renderables = new Map<symbol, Renderable>()
    static chunks: Array<Chunk> = []
    static offScreenCanvas =  document.createElement("canvas")
    static offScreenContext = RenderingEngine.offScreenCanvas.getContext("2d")!

    static loop(timestamp: number) {
        const fps = 1000/60     // 60fps
        const elapsed = timestamp - then
        if(elapsed >= fps) {  // 60프레임으로 제한
            then = timestamp - (elapsed % fps)
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
            RenderingEngine.offScreenContext.clearRect(0, 0, window.innerWidth, window.innerHeight)
            RenderingEngine.render()
            RenderingEngine.upload()
        }
        requestAnimationFrame(RenderingEngine.loop)
    }

    static upload() {
        socket.emit("update-user-data", players.get(socketId))
    }

    static render() {
        RenderingEngine.rectLines = []
        // camera
        players.forEach((value, key) => {
            if(key === socketId) {
                playerToCenter(value)                
            }
        })
        // floor
        for(const chunk of RenderingEngine.chunks){
            if(chunk.shouldRendered(players.get(socketId)!)){
                chunk.render(RenderingEngine.offScreenContext)
            }
        }
        ctx.drawImage(RenderingEngine.offScreenCanvas, 0, 0)

        // walls
        walls.forEach((value, _key) => {
            value.create()
        })
        
        // players
        let myPlayerData!: Player
        players.forEach((value, key) => {
            restoreIntersectionPoints(players.get(socketId)!, RenderingEngine.rotateAngle)
            if(key === socketId) {
                myPlayerData = value
            }
            // 보안상의 이유로  
            if(isEntityInSight(players.get(socketId)!, value)) {
                value.create()
                
            }
            // restoreIntersectionPoints(players.get(socketId)!, RenderingEngine.rotateAngle)
        })
        renderPlayerSight(myPlayerData, RenderingEngine.rayPoints, RenderingEngine.rotateAngle)
        move()

        currentPlayer.innerText = `${players.size}/5`
        // reset
        RenderingEngine.rectVertexes = []
        RenderingEngine.rayPoints = []
    }

    static init() {
        RenderingEngine.offScreenCanvas.width = window.innerWidth
        RenderingEngine.offScreenCanvas.height = window.innerHeight
        // new Wall({x: 700, y: 300, w: 600, h: 300}).create()

        // new Wall({x: 700, y: 300, w: 48, h: 600}, "side").create()

        new Wall({x: 700, y: 600, w: 42, h: 92}).create()


        //@lotinex
        const chunkCount = 1;
        const tileCount = 100;
        const chunkSize = tileCount * tileSize;
        for(let i=0; i<chunkCount; i++){
            for(let j=0; j<chunkCount; j++){
                const x = j * chunkSize
                const y = i * chunkSize
                const chunk = new Chunk(x, y, x + chunkSize, y + chunkSize)
                for(let ty=0; ty<tileCount; ty++){
                    for(let tx=0; tx<tileCount; tx++){
                        chunk.add(new Tile(x + tx * tileSize, y + ty * tileSize))
                    }
                }
                RenderingEngine.chunks.push(chunk)
            }
        }
        //@lotinex-end
        RenderingEngine.upload()
        requestAnimationFrame(RenderingEngine.loop)
    }
}




// player move ===========================================================>
const keyPress = {w: false, a: false, s: false, d: false}

window.addEventListener('keydown', (event) => {
    if(event.key === 'w' || event.key === 'W') {
        keyPress.w = true
    }
    if(event.key === 'a'  || event.key === 'A') {
        keyPress.a = true
    }
    if(event.key === 's'  || event.key === 'S') {
        keyPress.s = true
    }
    if(event.key === 'd'  || event.key === 'D') {
        keyPress.d = true
    }
})
window.addEventListener('keyup', (event) => {
    if(event.key === 'w') keyPress.w = false
    if(event.key === 'a') keyPress.a = false
    if(event.key === 's') keyPress.s = false
    if(event.key === 'd') keyPress.d = false
})
const move = () => {
    players.forEach((value, key) => {
        if(key === socketId) {
            for(let i = 0; i < moveSpeed; i++) {
                walls.forEach(wall => {
                    detectCollision(value, wall)
                })
                if(keyPress.w) {
                    if(collisionDetection.up) {
                        value.move("up")
                    }
                }
                if(keyPress.a) {
                    if(collisionDetection.left) {
                        value.move("left")
                    }
                }
                if(keyPress.s) {
                    if(collisionDetection.down){
                        value.move("down")
                    }
                }
                if(keyPress.d) {
                    if(collisionDetection.right){
                        value.move("right")
                    }
                }
                collisionDetection = {left: true, down: true, right: true, up: true}
            }
        }
    })
}
// player move ===========================================================>

// UI Systems ===========================================================>
let optionPop = false
optionBtn.addEventListener("click", () => {
    if(!optionPop) {
        option.style.display = "block"
        optionPop = true
    } else {
        option.style.display = "none"
        optionPop = false
    }
    
})
let isStart = false
start.addEventListener("click", async () => {
    if(!isStart) {
        if(players.size >= 2) {
            isStart = true
            socket.emit("start-request")
        }  
    }
})
leave.addEventListener("click", () => {
    ipcRenderer.send("store-roomData-session-request", {})
    location.replace("room.html")
})
socket.on("you-are-tagger", (res) => {
    if(res.id === socketId) {
        console.log("you are tagger!")
        console.log(res.role)
        players.set(res.id, new Player(res.id, res, res.name, res.role))
    }
})
// UI Systems ===========================================================>