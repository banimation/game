import { io } from "socket.io-client"

const canvas = document.getElementById("canvas") as HTMLCanvasElement
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D

const fogCanvas = document.getElementById("fog") as HTMLCanvasElement
const fog = fogCanvas.getContext("2d") as CanvasRenderingContext2D

const floorCanvas = document.getElementById("floor") as HTMLCanvasElement
const floor = floorCanvas.getContext("2d") as CanvasRenderingContext2D

fogCanvas.width = window.innerWidth
fogCanvas.height = window.innerHeight
canvas.width = window.innerWidth
canvas.height = window.innerHeight
floorCanvas.width = window.innerWidth
floorCanvas.height = window.innerHeight

const walls = new Map<Rect, Rect>()
const players = new Map<string, Player>()
let camera: {x: number, y: number} = {x: 0, y: 0}

let userId: string

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
        fog.fillRect(value.location.x + camera.x, value.location.y + camera.y, value.location.w, value.location.h)
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

class Player {
    id: string
    location: Entity
    color: string
    constructor(id: string, location: Entity, color: string) {
        this.id = id
        this.location = location
        this.color = color
    }
    create() {
        ctx.save()
        ctx.fillStyle = this.color;
        //ctx.drawImage(this.texture, this.location.x, this.location.y, this.location.w, this.location.h)
        ctx.fillRect(this.location.x + camera.x, this.location.y + camera.y, this.location.w, this.location.h)
        ctx.restore()
        players.set(this.id, this)
    }
    getAxis() {
        const axis = {
            x: (this.location.x + this.location.w / 2),
            y: (this.location.y + this.location.h / 2)
        }
        return axis
    }
    getLine() {
        const lines = [
            new Line({x: this.location.x, y: this.location.y}, {x: this.location.x, y: (this.location.y + this.location.h)}),
            new Line({x: this.location.x, y: (this.location.y + this.location.h)}, {x: (this.location.x + this.location.w), y: (this.location.y + this.location.h)}),
            new Line({x: (this.location.x + this.location.w), y: (this.location.y + this.location.h)}, {x: (this.location.x + this.location.w), y: this.location.y}),
            new Line({x: (this.location.x + this.location.w), y: this.location.y}, {x: this.location.x, y: this.location.y})
        ]
        return lines
    }
    move(x: number, y: number) {
        this.location.x += x
        this.location.y += y
    }
}
class Rect {
    location: Entity
    constructor(location: Entity) {
        this.location = location
    }
    create() {
        // 여기 나중에 최적화를 위해서 다 갈아엎어야함
        ctx.fillStyle = "rgb(29, 23, 28)"
        ctx.fillRect(this.location.x + camera.x, this.location.y + camera.y, this.location.w, this.location.h)
        RenderingEngine.rectVertexes.push(
            {x: this.location.x, y: this.location.y},
            {x: this.location.x, y: (this.location.y + this.location.h)},
            {x: (this.location.x + this.location.w), y: (this.location.y + this.location.h)},
            {x: (this.location.x + this.location.w), y: this.location.y}
        )
        RenderingEngine.rectLines.push(
            new Line({x: this.location.x, y: this.location.y}, {x: this.location.x, y: (this.location.y + this.location.h)}),
            new Line({x: this.location.x, y: (this.location.y + this.location.h)}, {x: (this.location.x + this.location.w), y: (this.location.y + this.location.h)}),
            new Line({x: (this.location.x + this.location.w), y: (this.location.y + this.location.h)}, {x: (this.location.x + this.location.w), y: this.location.y}),
            new Line({x: (this.location.x + this.location.w), y: this.location.y}, {x: this.location.x, y: this.location.y}),
        )
        walls.set(this, this)
    }
    getLine() {
        const lines = [
            new Line({x: this.location.x, y: this.location.y}, {x: this.location.x, y: (this.location.y + this.location.h)}),
            new Line({x: this.location.x, y: (this.location.y + this.location.h)}, {x: (this.location.x + this.location.w), y: (this.location.y + this.location.h)}),
            new Line({x: (this.location.x + this.location.w), y: (this.location.y + this.location.h)}, {x: (this.location.x + this.location.w), y: this.location.y}),
            new Line({x: (this.location.x + this.location.w), y: this.location.y}, {x: this.location.x, y: this.location.y})
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
        ctx.moveTo(this.from.x, this.from.y)
        ctx.lineTo(this.to.x, this.to.y)
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
}

// engine ================================================================>
class RenderingEngine {
    static rectLines: Array<Line> = []
    static rectVertexes: Array<Axis> = []
    static rayPoints: Array<Axis> = []
    static entitiesToRender = new Map<string, Player>()
    static rotateAngle: number = 1

    static loop() {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
        RenderingEngine.upload()
        RenderingEngine.render()
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
        
        /*
        for(const point of RenderingEngine.rayPoints) {
            new Ray(value.getAxis(), point, "red").create()
        }
        */
        renderPlayerSight(myPlayerData, RenderingEngine.rayPoints, RenderingEngine.rotateAngle)
        
        RenderingEngine.rectVertexes = []
        RenderingEngine.rayPoints = []
    }

    static init() {
        players.set(userId, new Player(userId, {x: 1, y: 1, w: 50, h: 50}, randomColor()))
        new Rect({x: 700, y: 300, w: 50, h: 200}).create()

        new Rect({x: 200, y: 200, w: 100, h: 400}).create()

        new Rect({x: 700, y: 600, w: 500, h: 200}).create()

        RenderingEngine.upload()
        requestAnimationFrame(RenderingEngine.loop)
    }
}

// socket ==============================================================>
socket.on("playerJoin", (id) => {
    console.log("joined!")
    userId = id
    new Player(userId, {x: 1, y: 1, w: 50, h: 50}, randomColor()).create()
    socket.emit("created", players.get(id))
    RenderingEngine.init()
})
socket.on("otherPlayerData", (value) => {
    new Player(value.id, value.location, value.color).create()
})

// other players leave
socket.on("playerLeave", (id) => {
    players.delete(id)
})

socket.on("otherPlayer", (value) => {
    players.set(value.id, new Player(value.id, value.location, value.color))
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
const moveSpeed = 8
const move = () => {
    players.forEach((value, key) => {
        if(key === userId) {
            if(keyPress.w) {
                value.move(0, -moveSpeed)
                
            }
            if(keyPress.a) {
                value.move(-moveSpeed, 0)
            }
            if(keyPress.s) {
                value.move(0, moveSpeed)
            }
            if(keyPress.d) {
                value.move(moveSpeed, 0)
            }
        }
        
    })
    requestAnimationFrame(move)
}
requestAnimationFrame(move)