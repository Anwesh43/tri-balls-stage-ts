const w : number = window.innerWidth
const h : number = window.innerHeight
const scGap : number = 0.01
const strokeFactor : number = 90
const sizeFactor : number = 2.9
const foreColor : string = "#673AB7"
const backColor : string = "#bdbdbd"
const delay : number = 20
const parts : number = 3
const nodes : number = 5

class Stage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w
        this.canvas.height = h
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : Stage = new Stage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }

    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n)) * n
    }

    static mirrorValue(scale : number, k : number) : number {
        return (1 - scale) * k + scale * (1 - k)
    }
}

class DrawingUtil {

    static drawCircle(context : CanvasRenderingContext2D, x : number, y : number, r : number, fill : boolean) {
        context.beginPath()
        context.arc(x, y, r, 0, 2 * Math.PI)
        if (fill) {
            context.fill()
        } else {
            context.stroke()
        }
    }

    static drawCircles(context : CanvasRenderingContext2D, i : number, size : number, gap : number, scale : number) {
        const cr : number = size / (parts + 1)
        const cGap : number = gap / parts
        const sc1 : number = ScaleUtil.divideScale(scale, 0, 2)
        const sc2 : number = ScaleUtil.divideScale(scale, 1, 2)
        for (var j = 0; j < parts; j++) {
            const sc2i : number = ScaleUtil.divideScale(sc2, j, parts)
            const updatedR : number = cr * ScaleUtil.mirrorValue(sc2i, i % 2)
            const x : number = 2 * cGap - j * cGap + gap * ScaleUtil.divideScale(sc1, j, parts)
            DrawingUtil.drawCircle(context, x, 0, updatedR, true)
            DrawingUtil.drawCircle(context, x, 0, cr, false)
        }
    }

    static drawBLNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        const gap : number = w / (nodes + 2)
        const size : number = gap / sizeFactor
        context.strokeStyle = foreColor
        context.fillStyle = foreColor
        context.lineCap = 'round'
        context.lineWidth = Math.min(w, h) / strokeFactor
        context.save()
        context.translate(gap * (i + 1), h / 2)
        DrawingUtil.drawCircles(context, i, size, gap, scale)
        context.restore()
    }
}

class State {

    scale : number = 0
    prevScale : number = 0
    dir : number = 0

    update(cb : Function) {
        this.scale += this.dir * scGap
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir
            this.dir = 0
            this.prevScale = this.scale
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale
            cb()
        }
    }
}

class Animator {

    animated : boolean = false
    interval : number

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false
            clearInterval(this.interval)
        }
    }
}

class BLNode {

    next : BLNode
    prev : BLNode
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < nodes - 1) {
            this.next = new BLNode(this.i + 1)
            this.next.prev = this
        }
    }

    draw(context : CanvasRenderingContext2D) {
        DrawingUtil.drawBLNode(context, this.i, this.state.scale)
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : BLNode {
        var curr : BLNode = this.prev
        if (dir == 1) {
            curr = this.next
        }
        if (curr) {
            return curr
        }
        cb()
        return this
    }
}

class BallList {

    curr : BLNode = new BLNode(0)
    dir : number = 1

    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir,() => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {

    bl : BallList = new BallList()
    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.bl.draw(context)
    }

    handleTap(cb : Function) {
        this.bl.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.bl.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}
