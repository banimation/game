"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const walls = new Map();
const players = new Map();
const socket = (0, socket_io_client_1.io)();
socket.emit("msg", "aaaa");
const userAxis = {
    x: 500,
    y: 350,
    w: 50,
    h: 50,
};
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
function findFurthestRectAxis(player) {
    let furthestLine = 0;
    for (let i = 0; i < RenderingEngine.rectVertexes.length; i++) {
        const line = Math.sqrt(Math.pow(player.getAxis().x - RenderingEngine.rectVertexes[i].x, 2) + Math.pow(player.getAxis().y - RenderingEngine.rectVertexes[i].y, 2));
        if (furthestLine < line) {
            furthestLine = line;
        }
    }
    RenderingEngine.rectVertexes = [];
    return furthestLine;
}
function getRayAxis(player, rotateAngle) {
    RenderingEngine.rayPoints = [];
    const furthestLine = findFurthestRectAxis(player);
    const zeroPointAxis = { x: player.getAxis().x, y: player.getAxis().y - furthestLine };
    let axis = zeroPointAxis;
    let updateAxis = { x: player.getAxis().x, y: player.getAxis().y - furthestLine };
    for (let n = 0; n < 360 / rotateAngle; n++) {
        for (let i = 0; i < RenderingEngine.rectLines.length; i++) {
            const x1 = player.getAxis().x;
            const y1 = player.getAxis().y;
            const x2 = axis.x;
            const y2 = axis.y;
            const x3 = RenderingEngine.rectLines[i].x3;
            const y3 = RenderingEngine.rectLines[i].y3;
            const x4 = RenderingEngine.rectLines[i].x4;
            const y4 = RenderingEngine.rectLines[i].y4;
            const determinedMatrix = (x2 - x1) * (y4 - y3) - (x4 - x3) * (y2 - y1);
            if (determinedMatrix === 0) {
                continue;
            }
            const scala1 = (1 / determinedMatrix) * ((y3 - y4) * (x3 - x1) + (x4 - x3) * (y3 - y1)) * -1;
            const scala2 = (1 / determinedMatrix) * ((y1 - y2) * (x3 - x1) + (x2 - x1) * (y3 - y1)) * -1;
            if ((scala1 < 1 && scala1 > 0) && (scala2 < 1 && scala2 > 0)) {
                const crossPointX = x1 + (x2 - x1) * scala1;
                const crossPointY = y1 + (y2 - y1) * scala1;
                if (Math.pow(updateAxis.x - player.getAxis().x, 2) + Math.pow(updateAxis.y - player.getAxis().y, 2) > Math.pow(crossPointX - player.getAxis().x, 2) + Math.pow(crossPointY - player.getAxis().y, 2)) {
                    updateAxis.x = crossPointX;
                    updateAxis.y = crossPointY;
                }
            }
        }
        RenderingEngine.rayPoints.push({ x: updateAxis.x, y: updateAxis.y });
        const nextAxis = {
            x: ((axis.x - player.getAxis().x) * Math.cos(rotateAngle * Math.PI / 180) - (axis.y - player.getAxis().y) * Math.sin(rotateAngle * Math.PI / 180)) + player.getAxis().x,
            y: ((axis.x - player.getAxis().x) * Math.sin(rotateAngle * Math.PI / 180) + (axis.y - player.getAxis().y) * Math.cos(rotateAngle * Math.PI / 180)) + player.getAxis().y
        };
        axis = nextAxis;
        updateAxis.x = nextAxis.x;
        updateAxis.y = nextAxis.y;
    }
}
function RenderMesh(player, axis, rotateAngle) {
    for (let i = 0; i < axis.length; i++) {
        ctx.fillStyle = "gray";
        ctx.beginPath();
        ctx.moveTo(player.getAxis().x, player.getAxis().y);
        ctx.lineTo(axis[i].x, axis[i].y);
        ctx.lineTo(axis[i !== (360 / rotateAngle - 1) ? i + 1 : 0].x, axis[i !== (360 / rotateAngle - 1) ? i + 1 : 0].y);
        ctx.fill();
    }
}
class Player {
    location;
    constructor(location) {
        this.location = location;
    }
    create() {
        ctx.fillStyle = "green";
        ctx.fillRect(this.location.x, this.location.y, this.location.w, this.location.h);
        players.set(this, this);
    }
    getAxis() {
        const axis = {
            x: (this.location.x + this.location.w / 2),
            y: (this.location.y + this.location.h / 2)
        };
        return axis;
    }
    move(x, y) {
        this.location.x += x;
        this.location.y += y;
    }
}
class Rect {
    location;
    constructor(location) {
        this.location = location;
    }
    create() {
        ctx.fillStyle = "#000";
        ctx.fillRect(this.location.x, this.location.y, this.location.w, this.location.h);
        RenderingEngine.rectVertexes.push({ x: this.location.x, y: this.location.y }, { x: this.location.x, y: (this.location.y + this.location.h) }, { x: (this.location.x + this.location.w), y: (this.location.y + this.location.h) }, { x: (this.location.x + this.location.w), y: this.location.y });
        RenderingEngine.rectLines.push(new Line({ x: this.location.x, y: this.location.y }, { x: this.location.x, y: (this.location.y + this.location.h) }), new Line({ x: this.location.x, y: (this.location.y + this.location.h) }, { x: (this.location.x + this.location.w), y: (this.location.y + this.location.h) }), new Line({ x: (this.location.x + this.location.w), y: (this.location.y + this.location.h) }, { x: (this.location.x + this.location.w), y: this.location.y }), new Line({ x: (this.location.x + this.location.w), y: this.location.y }, { x: this.location.x, y: this.location.y }));
        walls.set(this, this);
    }
}
class Ray {
    from;
    to;
    color;
    constructor(from, to, color) {
        this.from = from;
        this.to = to;
        this.color = color;
    }
    create() {
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.from.x, this.from.y);
        ctx.lineTo(this.to.x, this.to.y);
        ctx.stroke();
    }
}
class Line {
    x3;
    y3;
    x4;
    y4;
    constructor(p1, p2) {
        this.x3 = p1.x;
        this.y3 = p1.y;
        this.x4 = p2.x;
        this.y4 = p2.y;
    }
}
class RenderingEngine {
    static rectLines = [];
    static rectVertexes = [];
    static rayPoints = [];
    static rotateAngle = 1;
    static loop() {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        RenderingEngine.render();
        requestAnimationFrame(RenderingEngine.loop);
    }
    static render() {
        RenderingEngine.rectLines = [];
        // walls
        walls.forEach((value, _key) => {
            value.create();
        });
        // players
        players.forEach((value, _key) => {
            value.create();
            getRayAxis(value, RenderingEngine.rotateAngle);
            // ray
            for (const point of RenderingEngine.rayPoints) {
                new Ray(value.getAxis(), point, "red").create();
            }
            // mesh
            RenderMesh(value, RenderingEngine.rayPoints, RenderingEngine.rotateAngle);
            RenderingEngine.rayPoints = [];
        });
    }
    static init() {
        const player = new Player(userAxis);
        player.create();
        const wall = new Rect({ x: 100, y: 300, w: 50, h: 200 });
        wall.create();
        const wall2 = new Rect({ x: 700, y: 300, w: 50, h: 200 });
        wall2.create();
        getRayAxis(player, RenderingEngine.rotateAngle);
        requestAnimationFrame(RenderingEngine.loop);
    }
}
RenderingEngine.init();
const keyPress = {
    w: false,
    a: false,
    s: false,
    d: false
};
window.addEventListener('keydown', (event) => {
    if (event.key === 'w') {
        keyPress.w = true;
    }
    if (event.key === 'a') {
        keyPress.a = true;
    }
    if (event.key === 's') {
        keyPress.s = true;
    }
    if (event.key === 'd') {
        keyPress.d = true;
    }
});
window.addEventListener('keyup', (event) => {
    if (event.key === 'w') {
        keyPress.w = false;
    }
    if (event.key === 'a') {
        keyPress.a = false;
    }
    if (event.key === 's') {
        keyPress.s = false;
    }
    if (event.key === 'd') {
        keyPress.d = false;
    }
});
const moveSpeed = 5;
const move = () => {
    if (keyPress.w) {
        players.forEach((value, _key) => {
            value.move(0, -moveSpeed);
        });
    }
    if (keyPress.a) {
        players.forEach((value, _key) => {
            value.move(-moveSpeed, 0);
        });
    }
    if (keyPress.s) {
        players.forEach((value, _key) => {
            value.move(0, moveSpeed);
        });
    }
    if (keyPress.d) {
        players.forEach((value, _key) => {
            value.move(moveSpeed, 0);
        });
    }
    requestAnimationFrame(move);
};
requestAnimationFrame(move);
