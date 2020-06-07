function assert(fn) {
    if (!fn()) {
        throw new Error(`assertion failed: ${fn} [${[...arguments].slice(1)}]`);
    }
}

function die(x) {
    throw new Error(x);
}

function validateWichmannHillStateInteger(x) {
    assert(_ => Number.isInteger(x), x);
    assert(_ => x >= 1, x);
    assert(_ => x <= 30000, x);
    return x;
}

class WichmannHillGenerator {
    constructor(state) {
        this.s1 = state[0];
        this.s2 = state[1];
        this.s3 = state[2];
    }

    static with(state) {
        return new WichmannHillGenerator(
            state.map(validateWichmannHillStateInteger)
        );
    }

    next() {
        this.s1 = (171 * this.s1) % 30269;
        this.s2 = (172 * this.s2) % 30307;
        this.s3 = (170 * this.s3) % 30323;
        return (this.s1 / 30269
                + this.s2 / 30307
                + this.s3 / 30323) % 1.0;
    }
}

/********************************************************************/

function makeMatrix(width, height, initialValue = 0) {
    const matrix = new Array(width * height).fill(initialValue);
    matrix.width = width;
    matrix.height = height;
    return matrix;
}

function copyMatrix(matrix) {
    const newMatrix = matrix.slice();
    newMatrix.width = matrix.width;
    newMatrix.height = matrix.height;
    return newMatrix;
}

function getXY(matrix, x, y) {
    return matrix[y * matrix.height + x];
}

function setXY(matrix, x, y, value) {
    matrix[y * matrix.height + x] = value;
}

function maxValueOf(array) {
    return array.reduce((x, y) => x > y ? x : y);
}

function mapMatrix(matrix, fn) {
    const newMatrix = copyMatrix(matrix);
    for (let x = 0; x < newMatrix.width; x++) {
        for (let y = 0; y < newMatrix.height; y++) {
            setXY(newMatrix, x, y, fn(getXY(matrix, x, y), x, y));
        }
    }

    return newMatrix;
}

function normalizeMatrix(matrix) {
    const max = maxValueOf(matrix);
    return mapMatrix(matrix, x => x / max);
}

function blitMatrix(matrixSrc, matrixDst, offsetX, offsetY) {
    for (let x = 0; x < matrixSrc.width; x++) {
        for (let y = 0; y < matrixSrc.height; y++) {
            if (x + offsetX >= matrixDst.width) continue;
            if (y + offsetY >= matrixDst.height) continue;
            setXY(matrixDst, x + offsetX, y + offsetY, getXY(matrixSrc, x, y));
        }
    }
}

function addMatrix(matrixSrc, matrixDst, offsetX, offsetY) {
    for (let x = 0; x < matrixSrc.width; x++) {
        for (let y = 0; y < matrixSrc.height; y++) {
            if (x + offsetX >= matrixDst.width) continue;
            if (y + offsetY >= matrixDst.height) continue;
            const oldValue = getXY(matrixDst, x + offsetX, y + offsetY);
            const newValue = getXY(matrixSrc, x, y);
            setXY(
                matrixDst,
                x + offsetX,
                y + offsetY,
                oldValue + newValue,
            );
        }
    }
}

const canvas = document.getElementsByTagName('canvas')[0] || die('no canvas');
const context = canvas.getContext('2d');

function drawMatrix(matrix) {
    const bytes = new Uint8ClampedArray(4 * matrix.width * matrix.height);
    for (let i = 0; i < matrix.length; i++) {
        bytes[i * 4 + 0] = matrix[i] * 255;
        bytes[i * 4 + 1] = matrix[i] * 255;
        bytes[i * 4 + 2] = matrix[i] * 255;
        bytes[i * 4 + 3] = 255;
    }

    const imageData = new ImageData(bytes, matrix.width, matrix.height);
    context.putImageData(imageData, 0, 0);
}

const blob = mapMatrix(normalizeMatrix(mapMatrix(makeMatrix(17, 17), (v, x, y) => {
    const cap = Math.sqrt(8 ** 2 + 8 ** 2);
    const xOff = x - 8;
    const yOff = y - 8;
    return (1 - Math.sqrt(xOff ** 2 + yOff ** 2) / cap * 1.1) ** 2;
})), x => x * 0.1);

let matrix = makeMatrix(Number(canvas.width), Number(canvas.height));
let contrast = 1;
const rng = WichmannHillGenerator.with([100, 100, 100]);

function nextBlob(random) {
    const x = (random() * matrix.width) | 0;
    const y = (random() * matrix.height) | 0;

    addMatrix(blob, matrix, x - 16, y - 8);
}

const contrastInput = document.querySelector('#contrast') || die('no contrast input');
const velocityInput = document.querySelector('#velocity') || die('no velocity input');
const attenuationInput = document.querySelector('#attenuation') || die('no attenuation input');

function animate() {
    const contrast = Number(contrastInput.value);
    const velocity = Number(velocityInput.value);
    const attenuation = 1 - (1 - Number(attenuationInput.value)) ** 8;

    for (let i = 0; i < velocity; i++) {
        nextBlob(_ => rng.next());
        // nextBlob(_ => Math.random());
    }
    drawMatrix(mapMatrix(normalizeMatrix(matrix), v => {
        return v ** contrast;
    }));

    matrix = mapMatrix(matrix, v => {
        return v * attenuation;
    });

    window.requestAnimationFrame(animate);
}

animate();

document.querySelector('button').addEventListener('click', e => {
    matrix = normalizeMatrix(matrix);
});
