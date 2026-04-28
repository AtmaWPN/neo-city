const canvas = document.getElementById("keyboard");
const input = document.getElementById("input")
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const LETTER_SPACING = 42;
const keyboardLayout = { // no capital letters! you don't deserve capital letters!
    top: {
        cw: ["y","b","p","q"],
        ccw: ["s","d","g","'"]
    },
    left: {
        cw: ["t","c","z","."],
        ccw: ["i","h","j",","]
    },
    bottom: {
        cw: ["e","l","k","@"],
        ccw: ["o","u","v","w"]
    },
    right: {
        cw: ["n","m","f","!"],
        ccw: ["a","r","x","?"]
    }
}

let easeOutSector = null;
let easeCounter = 0;
const EASE_FRAMES = 10;
const MAX_TRANSPARENCY = 40;
function drawBackground() {
    ctx.fillStyle = "#aaeeee";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.lineWidth = 8;
    ctx.strokeStyle = "#000000"
    // Draw Sector Dividing Lines
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(WIDTH - 16, HEIGHT - 16);
    ctx.moveTo(WIDTH - 16, 16);
    ctx.lineTo(16, HEIGHT - 16);
    ctx.closePath();
    ctx.stroke();
    // Draw Center Sector
    ctx.beginPath();
    ctx.ellipse(WIDTH / 2, HEIGHT / 2, WIDTH / 6, HEIGHT / 6, 0, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(WIDTH / 2, HEIGHT / 2, WIDTH / 6, HEIGHT / 6, 0, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.stroke();
    // Icons
    ctx.font = "bold 24px serif"
    ctx.fillStyle = "#000000";
    let shiftStatus = `SHIFT: ${State.shift}`;
    const shiftTextSize = ctx.measureText(shiftStatus);
    ctx.fillText(shiftStatus, WIDTH / 2 - shiftTextSize.width / 2, HEIGHT / 5 + shiftTextSize.emHeightAscent / 2);
    const backspace = "BACKSPACE";
    const backspaceTextSize = ctx.measureText(backspace);
    ctx.fillText(backspace, 4 * WIDTH / 5 - shiftTextSize.width / 2, HEIGHT / 2 + shiftTextSize.emHeightAscent / 2);
    const enter = "ENTER";
    const enterTextSize = ctx.measureText(enter);
    ctx.fillText(enter, WIDTH / 2 - shiftTextSize.width / 2, 4 * HEIGHT / 5 + shiftTextSize.emHeightAscent / 2);
    // Draw Letters
    keyboardLayout.top.cw.forEach((it, index) => {
        const cwLetter = State.shift > 0 ? it.toUpperCase() : it;
        const cwTextSize = ctx.measureText(cwLetter);
        ctx.fillText(cwLetter, WIDTH / 2 + index * LETTER_SPACING + 60 - cwTextSize.width / 2, HEIGHT / 2 - index * LETTER_SPACING - 100 + cwTextSize.emHeightAscent / 2);
        const ccwLetter = State.shift > 0 ? keyboardLayout.top.ccw[index].toUpperCase() : keyboardLayout.top.ccw[index];
        const ccwTextSize = ctx.measureText(ccwLetter);
        ctx.fillText(ccwLetter, WIDTH / 2 - index * LETTER_SPACING - 60 - ccwTextSize.width / 2, HEIGHT / 2 - index * LETTER_SPACING - 100 + ccwTextSize.emHeightAscent / 2);
    })
    keyboardLayout.left.cw.forEach((it, index) => {
        const cwLetter = State.shift > 0 ? it.toUpperCase() : it;
        const cwTextSize = ctx.measureText(it);
        ctx.fillText(cwLetter, WIDTH / 2 - index * LETTER_SPACING - 100 - cwTextSize.width / 2, HEIGHT / 2 - index * LETTER_SPACING - 60 + cwTextSize.emHeightAscent / 2);
        const ccwLetter = State.shift > 0 ? keyboardLayout.left.ccw[index].toUpperCase() : keyboardLayout.left.ccw[index];
        const ccwTextSize = ctx.measureText(ccwLetter);
        ctx.fillText(ccwLetter, WIDTH / 2 - index * LETTER_SPACING - 100 - ccwTextSize.width / 2, HEIGHT / 2 + index * LETTER_SPACING + 60 + ccwTextSize.emHeightAscent / 2);
    })
    keyboardLayout.bottom.cw.forEach((it, index) => {
        const cwLetter = State.shift > 0 ? it.toUpperCase() : it;
        const cwTextSize = ctx.measureText(it);
        ctx.fillText(cwLetter, WIDTH / 2 - index * LETTER_SPACING - 60 - cwTextSize.width / 2, HEIGHT / 2 + index * LETTER_SPACING + 100 + cwTextSize.emHeightAscent / 2);
        const ccwLetter = State.shift > 0 ? keyboardLayout.bottom.ccw[index].toUpperCase() : keyboardLayout.bottom.ccw[index];
        const ccwTextSize = ctx.measureText(ccwLetter);
        ctx.fillText(ccwLetter, WIDTH / 2 + index * LETTER_SPACING + 60 - ccwTextSize.width / 2, HEIGHT / 2 + index * LETTER_SPACING + 100 + ccwTextSize.emHeightAscent / 2);
    })
    keyboardLayout.right.cw.forEach((it, index) => {
        const cwLetter = State.shift > 0 ? it.toUpperCase() : it;
        const cwTextSize = ctx.measureText(it);
        ctx.fillText(cwLetter, WIDTH / 2 + index * LETTER_SPACING + 100 - cwTextSize.width / 2, HEIGHT / 2 + index * LETTER_SPACING + 60 + cwTextSize.emHeightAscent / 2);
        const ccwLetter = State.shift > 0 ? keyboardLayout.right.ccw[index].toUpperCase() : keyboardLayout.right.ccw[index];
        const ccwTextSize = ctx.measureText(ccwLetter);
        ctx.fillText(ccwLetter, WIDTH / 2 + index * LETTER_SPACING + 100 - ccwTextSize.width / 2, HEIGHT / 2 - index * LETTER_SPACING - 60 + ccwTextSize.emHeightAscent / 2);
    })
    if (State.sector !== State.prevSector) {
        easeOutSector = State.prevSector;
        easeCounter = 0;
    }
    if (easeCounter < EASE_FRAMES) {
        easeCounter += 1;
    }
    // draw previous sector
    let transparency = (EASE_FRAMES - easeCounter) * MAX_TRANSPARENCY / EASE_FRAMES;
    ctx.fillStyle = `#000000${transparency < 10 ? "0" + transparency.toString() : transparency.toString()}`;
    ctx.beginPath();
    switch (easeOutSector) {
        case Sector.CENTER:
            ctx.ellipse(WIDTH / 2, HEIGHT / 2, WIDTH / 6, HEIGHT / 6, 0, 0, 2 * Math.PI);
            break;
        case Sector.TOP:
            ctx.moveTo(0, 0);
            ctx.lineTo(WIDTH / 2, HEIGHT / 2);
            ctx.lineTo(WIDTH, 0);
            break;
        case Sector.LEFT:
            ctx.moveTo(0, 0);
            ctx.lineTo(WIDTH / 2, HEIGHT / 2);
            ctx.lineTo(0, HEIGHT);
            break;
        case Sector.BOTTOM:
            ctx.moveTo(0, HEIGHT);
            ctx.lineTo(WIDTH / 2, HEIGHT / 2);
            ctx.lineTo(WIDTH, HEIGHT);
            break;
        case Sector.RIGHT:
            ctx.moveTo(WIDTH, 0);
            ctx.lineTo(WIDTH / 2, HEIGHT / 2);
            ctx.lineTo(WIDTH, HEIGHT);
            break;
        case null:
            break;
    }
    ctx.closePath();
    ctx.fill();
    // draw current sector
    transparency = easeCounter * MAX_TRANSPARENCY / EASE_FRAMES;
    ctx.fillStyle = `#000000${transparency < 10 ? "0" + transparency.toString() : transparency.toString()}`;
    ctx.beginPath();
    switch (State.sector) {
        case Sector.CENTER:
            ctx.ellipse(WIDTH / 2, HEIGHT / 2, WIDTH / 6, HEIGHT / 6, 0, 0, 2 * Math.PI);
            break;
        case Sector.TOP:
            ctx.moveTo(0, 0);
            ctx.lineTo(WIDTH / 2, HEIGHT / 2);
            ctx.lineTo(WIDTH, 0);
            break;
        case Sector.LEFT:
            ctx.moveTo(0, 0);
            ctx.lineTo(WIDTH / 2, HEIGHT / 2);
            ctx.lineTo(0, HEIGHT);
            break;
        case Sector.BOTTOM:
            ctx.moveTo(0, HEIGHT);
            ctx.lineTo(WIDTH / 2, HEIGHT / 2);
            ctx.lineTo(WIDTH, HEIGHT);
            break;
        case Sector.RIGHT:
            ctx.moveTo(WIDTH, 0);
            ctx.lineTo(WIDTH / 2, HEIGHT / 2);
            ctx.lineTo(WIDTH, HEIGHT);
            break;
        case null:
            break;
    }
    ctx.closePath();
    ctx.fill();
    // draw path (if applicable)
    if (State.gp !== null || State.mouse.path.length === 0) return;
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#E53935";
    ctx.beginPath();
    ctx.moveTo(State.mouse.path[0][0], State.mouse.path[0][1]);
    State.mouse.path.forEach((it) => {
        ctx.lineTo(it[0], it[1]);
    })
    ctx.stroke();
}

const Sector = {
    CENTER: "center",
    TOP: "top",
    LEFT: "left",
    BOTTOM: "bottom",
    RIGHT: "right"
}
const ShiftState = {
    LOWERCASE: 0,
    UPPER_ONCE: 1,
    UPPERCASE: 2
}

const State = {
    gp: null,
    mouse: {
        m1: false,
        x: 0,
        y: 0,
        path: []
    },

    prevSector: null,
    sector: null,
    prevPressed: false,
    pressed: false,

    typing: false,
    requestedLetter: {
        sector: null,
        index: 0
    },
    shift: ShiftState.LOWERCASE
}

window.addEventListener("gamepadconnected", (e) => {
    State.gp = navigator.getGamepads()[e.gamepad.index];
    console.log(`Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}. ${e.gamepad.buttons.length} buttons, ${e.gamepad.axes.length} axes.`);
});

document.addEventListener("mouseup", (event) => { State.mouse.m1 = false })
document.addEventListener("mousedown", (event) => { if (Math.abs(State.mouse.x) <= 1 && Math.abs(State.mouse.y) <= 1) State.mouse.m1 = true })
document.addEventListener("mousemove", mouseMoveHandler);
function mouseMoveHandler(e) {
  const relativeX = e.clientX - canvas.offsetLeft;
  const relativeY = e.clientY - canvas.offsetTop;

  if (State.mouse.m1) {
    State.mouse.path.push([relativeX, relativeY]);
  }
  
  State.mouse.x = (relativeX / WIDTH) * 2 - 1
  State.mouse.y = (relativeY / HEIGHT) * 2 - 1
}

function gameLoop(timestamp) {
    drawBackground();
    if (State.gp === null) {
        console.log(`Left Mouse Button: ${State.mouse.m1}`, `Mouse X Pos: ${State.mouse.x}`, `Mouse Y Pos: ${State.mouse.y}`);
        if (!State.mouse.m1 || (State.sector === Sector.CENTER && State.sector !== State.prevSector)) {
            State.mouse.path = [];
        }

        const x = State.mouse.x;
        const y = State.mouse.y;

        const magnitude = Math.sqrt(x ** 2 + y ** 2);
        State.prevSector = State.sector;
        State.sector = Sector.CENTER;
        if (magnitude > 0.34) {
            if (x > 0 && Math.abs(x) >= Math.abs(y)) State.sector = Sector.RIGHT;
            if (y > 0 && Math.abs(y) > Math.abs(x)) State.sector = Sector.BOTTOM;
            if (x < 0 && Math.abs(x) >= Math.abs(y)) State.sector = Sector.LEFT;
            if (y < 0 && Math.abs(y) > Math.abs(x)) State.sector = Sector.TOP;
        }

        State.prevPressed = State.pressed;
        State.pressed = State.mouse.m1;
    } else {
        console.log(`Right Trigger: ${State.gp.buttons[5].pressed}`, `Right Stick X Axis: ${State.gp.axes[4]}`, `Right Stick Y Axis: ${State.gp.axes[5]}`);
        const x = State.gp.axes[4];
        const y = State.gp.axes[5];

        const magnitude = Math.sqrt(x ** 2 + y ** 2);
        State.prevSector = State.sector;
        State.sector = Sector.CENTER;
        if (magnitude > 0.34) {
            if (x > 0 && Math.abs(x) >= Math.abs(y)) State.sector = Sector.RIGHT;
            if (y > 0 && Math.abs(y) > Math.abs(x)) State.sector = Sector.BOTTOM;
            if (x < 0 && Math.abs(x) >= Math.abs(y)) State.sector = Sector.LEFT;
            if (y < 0 && Math.abs(y) > Math.abs(x)) State.sector = Sector.TOP;
        }

        State.prevPressed = State.pressed;
        State.pressed = State.gp.buttons[5].pressed;
    }

    if (State.typing && !State.pressed) {
        if (State.sector === Sector.CENTER) {
            input.value += " ";
        }
        State.typing = false;
    }
    if (!State.prevPressed && State.pressed) {
        if (State.sector === Sector.CENTER) {
            State.typing = true;
        }
        if (State.sector === Sector.RIGHT) {
            input.value = input.value.substr(0, input.value.length - 1);
        }
        if (State.sector === Sector.BOTTOM) {
            input.value += "\n";
        }
        if (State.sector === Sector.TOP) {
            State.shift = (State.shift + 1) % 3;
        }
    }

    if (State.typing === true && State.sector !== State.prevSector) {
        if (State.prevSector === Sector.CENTER) {
            State.requestedLetter.sector = State.sector;
        } else if ((State.prevSector === Sector.TOP && State.sector === Sector.LEFT) || (State.prevSector === Sector.LEFT && State.sector === Sector.BOTTOM) || (State.prevSector === Sector.BOTTOM && State.sector === Sector.RIGHT) || (State.prevSector === Sector.RIGHT && State.sector === Sector.TOP)) {
            State.requestedLetter.index -= 1;
        } else if ((State.prevSector === Sector.TOP && State.sector === Sector.RIGHT) || (State.prevSector === Sector.LEFT && State.sector === Sector.TOP) || (State.prevSector === Sector.BOTTOM && State.sector === Sector.LEFT) || (State.prevSector === Sector.RIGHT && State.sector === Sector.BOTTOM)) {
            State.requestedLetter.index += 1;
        } else if (State.sector === Sector.CENTER) {
            if (State.requestedLetter.index !== 0 && Math.abs(State.requestedLetter.index) <= 4) {
                const letter = keyboardLayout[State.requestedLetter.sector][State.requestedLetter.index > 0 ? "cw" : "ccw"][Math.abs(State.requestedLetter.index) - 1]
                input.value += State.shift > 0 ? letter.toUpperCase() : letter;
                if (State.shift === 1) State.shift = 0;
            }
            State.requestedLetter.sector = Sector.CENTER;
            State.requestedLetter.index = 0;
        } else {
            State.typing = false;
            console.log("Gesture Not Recognized");
        }
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
