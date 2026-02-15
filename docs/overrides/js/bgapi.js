let port = null;
let reader = null;
let waitingForResponse = null;
let waitingForResponseType = null;
let keepReading = true;
let onClosedCallback = null;

const write = async function(data) {
    const writer = port.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
};

const messageTransformer = function () {
    const buffer = [];
    return new TransformStream({
        transform(chunck, controller) {
            buffer.push(...chunck);
            if (buffer.length === 0) {
                return;
            }

            const commandStart = buffer.indexOf(0x08);
            const eventStart = buffer.indexOf(0x88);

            if (commandStart === -1 && eventStart === -1) {
                buffer.splice(0, buffer.length);
                return;
            }

            if (commandStart !== 0 && eventStart !== 0) {
                const start = Math.min(
                    commandStart > -1 ? commandStart : Number.MAX_SAFE_INTEGER,
                    eventStart > -1 ? eventStart : Number.MAX_SAFE_INTEGER,
                );
                
                buffer.splice(0, start);
            }

            if (buffer.length < 4) {
                return;
            }

            const payloadSize = buffer[1];
            if (buffer.length < payloadSize + 4) {
                return;
            }

            controller.enqueue(buffer.slice(0, payloadSize + 4));
            buffer.splice(0, payloadSize + 4);
            if (buffer.length > 0) {
                this.transform([], controller);
            }
        },
        flush(controller) {
            controller.terminate();
        }
    });
};

const read = async function() {
    while (port.readable && keepReading) {
        const writable = new TransformStream();
        const streamClosed = port.readable.pipeTo(writable.writable);
        reader = writable.readable.pipeThrough(messageTransformer()).getReader();
        try {
            while (true) {
                const { value, done } = await reader.read();

                if (done) {
                    break;
                }

                if (waitingForResponseType && JSON.stringify(value.slice(2, 2 + waitingForResponseType.length)) === JSON.stringify(waitingForResponseType)) {
                    waitingForResponse(value.slice(4));
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            await reader.releaseLock();
            await streamClosed.catch(() => {});
        }
    }

    await port.close();
};

const sendCommandAndWaitForResponse = async function (command) {
    const response = new Promise((resolve, reject) => {
        waitingForResponseType = Array.from(command.slice(2, 4));
        waitingForResponse = resolve;
        setTimeout(() => reject('Command response timeout!'), 4000);
    });

    const [r,] = await Promise.all([response, write(command)]);

    return r;
};

const sendCommandAndWaitForEvent = async function (command, event) {
    const response = new Promise((resolve, reject) => {
        waitingForResponseType = Array.from(event);
        waitingForResponse = resolve;
        setTimeout(() => reject('Command response timeout!'), 5000);
    });

    const [r,] = await Promise.all([response, write(command)]);

    return r;
};

const connect = async function () {
    keepReading = true;
    port = await navigator.serial.requestPort();
    await port.open({baudRate: 115200});
    read().then(() => {
        if (onClosedCallback) {
            onClosedCallback();
        }
    });
};

const closePort = async function () {
    await new Promise((resolve, reject) => {
        keepReading = false;
        reader.cancel();
        onClosedCallback = resolve;
        setTimeout(() => reject(), 2000);
    });
};

const hello = async function () {
    await sendCommandAndWaitForResponse(new Uint8Array([0x08, 0x00, 0x01, 0x02])); // hello
};

const getSerialNumber = async function () {
    const textDecoder = new TextDecoder();
    const rawResponse = await sendCommandAndWaitForEvent(new Uint8Array([0x08, 0x00, 0x07, 0x01]), new Uint8Array([0x07, 0x00, 0x01, 0x80])); // Send PS Dump and wait for key $8001

    return textDecoder.decode(new Uint8Array(rawResponse.slice(3)));
};

const flashFirmware = async function (firmware, callback) {
    await sendCommandAndWaitForResponse(new Uint8Array([0x08, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00])); // Flash Set Address

    let written = 0;
    while (written < firmware.byteLength) {
        const chunk = new Uint8Array(firmware.slice(written, written+128));
        await sendCommandAndWaitForResponse(new Uint8Array([0x08, chunk.length+1, 0x00, 0x02, chunk.length, ...chunk])); // Flash upload
        written += 128;
        if (callback !== undefined) {
            callback(written/firmware.byteLength*100);
        }
    }

    await sendCommandAndWaitForResponse(new Uint8Array([0x08, 0x00, 0x00, 0x03])); // Flash Upload Finish
};

const resetToDfu = async function () {
    await sendCommandAndWaitForEvent(new Uint8Array([0x08, 0x01, 0x01, 0x01, 0x01]), new Uint8Array([0x00, 0x00])); // reset to DFU and wait for dfu boot event
};

const resetToNormalMode = async function () {
    await sendCommandAndWaitForEvent(new Uint8Array([0x08, 0x01, 0x00, 0x00, 0x00]), new Uint8Array([0x01, 0x00])); // send reset to normal mode and wait for normal boot event
};

const isStuckInDfu = async function () {
    try {
        await sendCommandAndWaitForEvent(new Uint8Array([0x08, 0x01, 0x00, 0x00, 0x00]), new Uint8Array([0x00, 0x00])); // send reset to normal mode and wait for dfu boot event
        return true;
    } catch (error) {
        return false;
    }
};