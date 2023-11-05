import { io } from "socket.io-client"

const canvas = document.getElementById("canvas") as HTMLCanvasElement
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D

const fogCanvas = document.getElementById("fog") as HTMLCanvasElement
const fog = fogCanvas.getContext("2d") as CanvasRenderingContext2D

const UICanvas = document.getElementById("ui") as HTMLCanvasElement
const UI = UICanvas.getContext("2d") as CanvasRenderingContext2D

fogCanvas.width = window.innerWidth
fogCanvas.height = window.innerHeight
canvas.width = window.innerWidth
canvas.height = window.innerHeight
UICanvas.width = window.innerWidth
UICanvas.height = window.innerHeight

const walls = new Map<Rect, Rect>()
const players = new Map<string, Player>()
let camera: {x: number, y: number} = {x: 0, y: 0}

let userId: string
let userName: string

const socket = io()

type Axis = {
    x: number,
    y: number
}
type Entity = {
    x: number,
    y: number,
    w: number,
    h: number
}

const image = new Image()
const imageSize = 768
image.src = "/texture/floor.png"
image.addEventListener("load", () => {
    renderFloor()
})

function renderFloor() {
    for (let i = 0; i < 10; i++) {
        for (let k = 0; k < 10; k++) {
          ctx.drawImage(image, (k * imageSize + camera.x) - 500, (i * imageSize + camera.y) - 500, imageSize, imageSize)
        }
    }
}

function randomColor() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16)
}

function findFurthestRectAxis(player: Player) {
    let furthestLine = 0
    for(let i = 0; i < RenderingEngine.rectVertexes.length; i++) {
        const line = Math.sqrt(Math.pow(player.getAxis().x - RenderingEngine.rectVertexes[i].x, 2) + Math.pow(player.getAxis().y - RenderingEngine.rectVertexes [i].y, 2))
        if(furthestLine < line) {
            furthestLine = line
        }
    }
    return 250 // furthestLine
}

function restoreIntersectionPoints(player: Player, rotateAngle: number) {
    RenderingEngine.rayPoints = []
    const furthestLine = findFurthestRectAxis(player)
    const zeroPointAxis = {x: player.getAxis().x, y: player.getAxis().y - furthestLine}
    let axis = zeroPointAxis
    let updateAxis = {x: player.getAxis().x, y: player.getAxis().y - furthestLine}
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
        fog.fillRect(value.data.x + camera.x, value.data.y + camera.y, value.data.w, value.data.h)
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
const moveSpeed = 7
let collisionDetection = {left: true, down: true, right: true, up: true}
function detectCollision(player: Player, rect: Rect) {
    let left = true
    let down = true
    let right = true
    let up = true
    const vx = player.getAxis().x - rect.getAxis().x
    const vy = player.getAxis().y - rect.getAxis().y
    const colliedX = player.data.w / 2 + rect.data.w / 2
    const colliedY = player.data.h / 2 + rect.data.h / 2
    if(player.data.x + player.data.w <= rect.data.x && (player.data.y + player.data.h > rect.data.y && player.data.y < rect.data.y + rect.data.h))  {
        if(Math.abs(vx) <= colliedX) {
            if(vx < 0) {
                right = false
            }
        }
    }
    if(player.data.x + player.data.w >= rect.data.x && (player.data.y + player.data.h > rect.data.y && player.data.y < rect.data.y + rect.data.h)) {
        if(Math.abs(vx) <= colliedX) {
            if(vx > 0) {
                if(collisionDetection.left) {
                    left = false
                }
                
            }
        }
    }
    if(player.data.y + player.data.h <= rect.data.y && (player.data.x < rect.data.x + rect.data.w && player.data.x + player.data.w > rect.data.x)) {
        if(Math.abs(vy) <= colliedY) {
            if(vy < 0) {
                down = false
            }
        }
    }
    if(player.data.y + player.data.h >= rect.data.y && (player.data.x < rect.data.x + rect.data.w && player.data.x + player.data.w > rect.data.x)) {
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

class Player {
    id: string
    data: Entity
    color: string
    name: string
    constructor(id: string, data: Entity, color: string, name: string) {
        this.id = id
        this.data = data
        this.color = color
        this.name = name
    }
    create() {
        ctx.save()
        ctx.fillStyle = this.color;
        //ctx.drawImage(this.texture, this.data.x, this.data.y, this.data.w, this.data.h)
        ctx.fillRect(this.data.x + camera.x, this.data.y + camera.y, this.data.w, this.data.h)
        ctx.font = "20px sans-serif"
        ctx.textAlign = "left"
        ctx.fillStyle = "black";
        ctx.fillText(this.name, this.data.x + camera.x, this.data.y + camera.y + this.data.h * 3 / 2)
        ctx.restore()
        players.set(this.id, this)
    }
    getAxis() {
        const axis = {
            x: (this.data.x + this.data.w / 2),
            y: (this.data.y + this.data.h / 2)
        }
        return axis
    }
    getLine() {
        const lines = [
            new Line({x: this.data.x, y: this.data.y}, {x: this.data.x, y: (this.data.y + this.data.h)}),
            new Line({x: this.data.x, y: (this.data.y + this.data.h)}, {x: (this.data.x + this.data.w), y: (this.data.y + this.data.h)}),
            new Line({x: (this.data.x + this.data.w), y: (this.data.y + this.data.h)}, {x: (this.data.x + this.data.w), y: this.data.y}),
            new Line({x: (this.data.x + this.data.w), y: this.data.y}, {x: this.data.x, y: this.data.y})
        ]
        return lines
    }
    move(direction: string) {
        if(direction === "left") {
            this.data.x -= 1
        } else if(direction === "down") {
            this.data.y += 1
        } else if(direction === "right") {
            this.data.x += 1
        } else if(direction === "up") {
            this.data.y -= 1
        }
    }
}
const wallImage = new Image()        
wallImage.src = ""
class Rect {
    data: Entity
    constructor(data: Entity) {
        this.data = data
    }
    create() {
        // 여기 나중에 최적화를 위해서 다 갈아엎어야함
        ctx.fillStyle = "rgb(29, 23, 28)"
        ctx.fillRect(this.data.x + camera.x, this.data.y + camera.y, this.data.w, this.data.h)

        const wallImageSize = {w: this.data.w, h: this.data.h}
        ctx.drawImage(wallImage, 0, 0, wallImageSize.w, wallImageSize.h, this.data.x + camera.x, this.data.y + camera.y, wallImageSize.w, wallImageSize.h)
       
        RenderingEngine.rectVertexes.push(
            {x: this.data.x, y: this.data.y},
            {x: this.data.x, y: (this.data.y + this.data.h)},
            {x: (this.data.x + this.data.w), y: (this.data.y + this.data.h)},
            {x: (this.data.x + this.data.w), y: this.data.y}
        )
        RenderingEngine.rectLines.push(
            new Line({x: this.data.x, y: this.data.y}, {x: this.data.x, y: (this.data.y + this.data.h)}),
            new Line({x: this.data.x, y: (this.data.y + this.data.h)}, {x: (this.data.x + this.data.w), y: (this.data.y + this.data.h)}),
            new Line({x: (this.data.x + this.data.w), y: (this.data.y + this.data.h)}, {x: (this.data.x + this.data.w), y: this.data.y}),
            new Line({x: (this.data.x + this.data.w), y: this.data.y}, {x: this.data.x, y: this.data.y}),
        )
        walls.set(this, this)
    }
    getAxis() {
        const axis = {
            x: (this.data.x + this.data.w / 2),
            y: (this.data.y + this.data.h / 2)
        }
        return axis
    }
    getLine() {
        const lines = [
            new Line({x: this.data.x, y: this.data.y}, {x: this.data.x, y: (this.data.y + this.data.h)}),
            new Line({x: this.data.x, y: (this.data.y + this.data.h)}, {x: (this.data.x + this.data.w), y: (this.data.y + this.data.h)}),
            new Line({x: (this.data.x + this.data.w), y: (this.data.y + this.data.h)}, {x: (this.data.x + this.data.w), y: this.data.y}),
            new Line({x: (this.data.x + this.data.w), y: this.data.y}, {x: this.data.x, y: this.data.y})
        ]
        return lines
    }
}
class Ray {
    from: Axis
    to: Axis
    color: string
    constructor(from: Axis, to: Axis, color: string) {
        this.from = from
        this.to = to
        this.color = color
    }
    create() {
        ctx.strokeStyle = this.color
        ctx.beginPath()
        ctx.moveTo(this.from.x + camera.x, this.from.y + camera.y)
        ctx.lineTo(this.to.x + camera.x, this.to.y + camera.y)
        ctx.stroke()
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
    const x = canvas.width / 2 - player.getAxis().x
    const y = canvas.height / 2 - player.getAxis().y
    camera = {x, y}
    // camera = {x: 0, y: 0}
}
let then: number = window.performance.now()
// engine ================================================================>
class RenderingEngine {
    static rectLines: Array<Line> = []
    static rectVertexes: Array<Axis> = []
    static rayPoints: Array<Axis> = []
    static entitiesToRender = new Map<string, Player>()
    static rotateAngle: number = 1

    static loop(timestamp: number) {
        const fps = 1000/60     // 60fps
        const elapsed = timestamp - then
        if(elapsed >= fps) {  // 60프레임으로 제한
            then = timestamp - (elapsed % fps)
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
            UI.clearRect(0, 0, window.innerWidth, window.innerHeight)
            RenderingEngine.render()
            RenderingEngine.upload()
        }
        requestAnimationFrame(RenderingEngine.loop)
    }

    static upload() {
        socket.emit("userData", players.get(userId))
    }

    static render() {
        RenderingEngine.rectLines = []
        // camera
        players.forEach((value, key) => {
            if(key === userId) {
                playerToCenter(value)                
            }
        })
        // some UI
        UI.font = "20px sans-serif"
        UI.textAlign = "center"
        ctx.textBaseline = "middle"
        UI.fillStyle = "#fff"
        UI.fillText(`${players.size} / 5`, 50, window.innerHeight - 10)
        UI.fillText(`시작`, window.innerWidth - 50, window.innerHeight - 10)
        // floor
        renderFloor()

        // walls
        walls.forEach((value, _key) => {
            value.create()
        })

        // players
        let myPlayerData!: Player

        players.forEach((value, key) => {
            restoreIntersectionPoints(players.get(userId)!, RenderingEngine.rotateAngle)
            if(key === userId) {
                myPlayerData = value
                // // draw Rays
                // for(let i = 0; i < 360 / RenderingEngine.rotateAngle; i++) {
                //     new Ray(value.getAxis(), RenderingEngine.rayPoints[i], "red").create()
                // }
            }
            // 보안상의 이유로  
            if(isEntityInSight(players.get(userId)!, value)) {
                value.create()
            }
            
        })

        fog.save()
        fog.fillStyle = "black"
        fog.fillRect(0, 0, window.innerWidth, window.innerHeight)
        fog.restore()

        renderPlayerSight(myPlayerData, RenderingEngine.rayPoints, RenderingEngine.rotateAngle)

        // move data
        move()

        // reset
        RenderingEngine.rectVertexes = []
        RenderingEngine.rayPoints = []
    }

    static init() {
        players.set(userId, new Player(userId, {x: 1, y: 1, w: 50, h: 50}, randomColor(), userName))
        new Rect({x: 700, y: 300, w: 50, h: 200}).create()

        new Rect({x: 200, y: 200, w: 100, h: 400}).create()

        new Rect({x: 700, y: 600, w: 500, h: 200}).create()

        RenderingEngine.upload()
        requestAnimationFrame(RenderingEngine.loop)
    }
}

// socket ==============================================================>
socket.on("playerJoin", (data: {socketId: string, userId: string}) => {
    console.log("joined!")
    userId = data.socketId
    userName = data.userId
    new Player(userId, {x: 1, y: 1, w: 50, h: 50}, randomColor(), data.userId).create()
    socket.emit("created", players.get(data.socketId))
    RenderingEngine.init()
})
socket.on("otherPlayerData", (value) => {
    new Player(value.id, value.data, value.color, value.name).create()
})

socket.on("otherPlayer", (value) => {
    players.set(value.id, new Player(value.id, value.data, value.color, value.name))
})

// other players leave
socket.on("playerLeave", (id) => {
    players.delete(id)
})


// player move ===========================================================>
const keyPress = {
    w: false,
    a: false,
    s: false,
    d: false
}
window.addEventListener('keydown', (event) => {
    if(event.key === 'w') {
        keyPress.w = true
    }
    if(event.key === 'a') {
        keyPress.a = true
    }
    if(event.key === 's') {
        keyPress.s = true
    }
    if(event.key === 'd') {
        keyPress.d = true
    }
})
window.addEventListener('keyup', (event) => {
    if(event.key === 'w') {
        keyPress.w = false
    }
    if(event.key === 'a') {
        keyPress.a = false
    }
    if(event.key === 's') {
        keyPress.s = false
    }
    if(event.key === 'd') {
        keyPress.d = false
    }
})
const move = () => {
    players.forEach((value, key) => {
        if(key === userId) {
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