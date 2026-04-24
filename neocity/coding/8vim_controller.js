const canvas = document.getElementById("keyboard");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

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


