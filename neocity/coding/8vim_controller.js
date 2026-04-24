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
    // Draw Letters
    ctx.font = "bold 24px serif"
    ctx.fillStyle = "#000000";
    keyboardLayout.top.cw.forEach((it, index) => {
        const cwText = ctx.measureText(it);
        ctx.fillText(it, WIDTH / 2 + index * LETTER_SPACING + 60 - cwText.width / 2, HEIGHT / 2 - index * LETTER_SPACING - 100 + cwText.emHeightAscent / 2);
        const ccwText = ctx.measureText(keyboardLayout.top.ccw[index]);
        ctx.fillText(keyboardLayout.top.ccw[index], WIDTH / 2 - index * LETTER_SPACING - 60 - ccwText.width / 2, HEIGHT / 2 - index * LETTER_SPACING - 100 + ccwText.emHeightAscent / 2);
    })
    keyboardLayout.left.cw.forEach((it, index) => {
        const cwText = ctx.measureText(it);
        ctx.fillText(it, WIDTH / 2 - index * LETTER_SPACING - 100 - cwText.width / 2, HEIGHT / 2 - index * LETTER_SPACING - 60 + cwText.emHeightAscent / 2);
        const ccwText = ctx.measureText(keyboardLayout.top.ccw[index]);
        ctx.fillText(keyboardLayout.left.ccw[index], WIDTH / 2 - index * LETTER_SPACING - 100 - ccwText.width / 2, HEIGHT / 2 + index * LETTER_SPACING + 60 + ccwText.emHeightAscent / 2);
    })
    keyboardLayout.bottom.cw.forEach((it, index) => {
        const cwText = ctx.measureText(it);
        ctx.fillText(it, WIDTH / 2 - index * LETTER_SPACING - 60 - cwText.width / 2, HEIGHT / 2 + index * LETTER_SPACING + 100 + cwText.emHeightAscent / 2);
        const ccwText = ctx.measureText(keyboardLayout.top.ccw[index]);
        ctx.fillText(keyboardLayout.bottom.ccw[index], WIDTH / 2 + index * LETTER_SPACING + 60 - ccwText.width / 2, HEIGHT / 2 + index * LETTER_SPACING + 100 + ccwText.emHeightAscent / 2);
    })
    keyboardLayout.right.cw.forEach((it, index) => {
        const cwText = ctx.measureText(it);
        ctx.fillText(it, WIDTH / 2 + index * LETTER_SPACING + 100 - cwText.width / 2, HEIGHT / 2 + index * LETTER_SPACING + 60 + cwText.emHeightAscent / 2);
        const ccwText = ctx.measureText(keyboardLayout.top.ccw[index]);
        ctx.fillText(keyboardLayout.right.ccw[index], WIDTH / 2 + index * LETTER_SPACING + 100 - ccwText.width / 2, HEIGHT / 2 - index * LETTER_SPACING - 60 + ccwText.emHeightAscent / 2);
    })
}

var gp = null;
window.addEventListener("gamepadconnected", (e) => {
    gp = navigator.getGamepads()[e.gamepad.index];
    console.log(`Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}. ${e.gamepad.buttons} buttons, ${e.gamepad.axes} axes.`);
});

const Sector = {
    CENTER: "center",
    TOP: "top",
    LEFT: "left",
    BOTTOM: "bottom",
    RIGHT: "right"
}

var pressed = false;
var typing = false;
var requestedLetter = 0;
var sector = Sector.CENTER;
var startingSector = Sector.CENTER;
var shift = 0;

function gameLoop(timestamp) {
    drawBackground();
    if (gp == null) {
        requestAnimationFrame(gameLoop);
        return;
    }
    console.log(`Right Trigger: ${gp.buttons[5].pressed}`, `Right Stick X Axis: ${gp.axes[4]}`, `Right Stick Y Axis: ${gp.axes[5]}`);
    const x = gp.axes[4];
    const y = gp.axes[5];

    if (typing == true && !gp.buttons[5].pressed) {
        if (sector = Sector.CENTER) {
            input.value += " ";
        }
        typing = false;
    }
    if (pressed == false && gp.buttons[5].pressed) {
        if (sector == Sector.CENTER) {
            typing = true;
        }
        if (sector == Sector.RIGHT) {
            input.value = input.value.substr(0, input.value.length - 1);
        }
        if (sector == Sector.BOTTOM) {
            input.value += "\n";
        }
        if (sector == Sector.TOP) {
            shift = (shift + 1) % 3;
        }
    }
    pressed = gp.buttons[5].pressed;

    const magnitude = Math.sqrt(gp.axes[4] ** 2 + gp.axes[5] ** 2);
    var new_sector = Sector.CENTER;
    if (magnitude > 0.1) {
        if (x > 0 && Math.abs(x) > Math.abs(y)) new_sector = Sector.RIGHT;
        if (y > 0 && Math.abs(y) > Math.abs(x)) new_sector = Sector.BOTTOM;
        if (x < 0 && Math.abs(x) > Math.abs(y)) new_sector = Sector.LEFT;
        if (y < 0 && Math.abs(y) > Math.abs(x)) new_sector = Sector.TOP;
    }
    if (typing == true && new_sector != sector) {
        if (sector == Sector.CENTER) {
            starting_sector = new_sector;
        } else if ((sector == Sector.TOP && new_sector == Sector.LEFT) || (sector == Sector.LEFT && new_sector == Sector.BOTTOM) || (sector == Sector.BOTTOM && new_sector == Sector.RIGHT) || (sector == Sector.RIGHT && new_sector == Sector.TOP)) {
            requestedLetter -= 1;
        } else if ((sector == Sector.TOP && new_sector == Sector.RIGHT) || (sector == Sector.LEFT && new_sector == Sector.TOP) || (sector == Sector.BOTTOM && new_sector == Sector.LEFT) || (sector == Sector.RIGHT && new_sector == Sector.BOTTOM)) {
            requestedLetter += 1;
        } else if (new_sector == Sector.CENTER) {
            if (requestedLetter != 0) {
                const letter = keyboardLayout[starting_sector][requestedLetter > 0 ? "cw" : "ccw"][Math.abs(requestedLetter) - 1]
                input.value += shift > 0 ? letter.toUpperCase() : letter;
                if (shift == 1) shift = 0;
            }
            starting_sector = Sector.CENTER;
            requestedLetter = 0;
        } else {
            typing = false;
            console.log("Gesture Not Recognized");
        }
    }
    sector = new_sector;

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);























