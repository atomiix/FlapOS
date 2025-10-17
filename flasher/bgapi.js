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
    let buffer = [];
    return new TransformStream({
        transform(chunck, controller) {
            buffer.push(...chunck);

            if (buffer.length < 4) {
                return;
            }
            
            const payloadSize = buffer[1];
            if (buffer.length - 4 < payloadSize) {
                return;
            }

            controller.enqueue(buffer.slice(0, 4 + payloadSize));
            buffer = buffer.slice(4 + payloadSize);
            this.transform([], controller);
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

                if (value[0] === 0x88) { // event
                    console.log('event', value);
                }
                if (value[0] === 0x08) { // command response
                    console.log('command response', value);
                    if (waitingForResponse && value[2] === waitingForResponseType[0] && value[3] === waitingForResponseType[1]) {
                        waitingForResponse(value.slice(4));
                    }
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
        waitingForResponseType = command.slice(2, 4);
        waitingForResponse = resolve;
        setTimeout(() => reject('Command response timeout!'), 2000);
    });
    await write(command);
    return await response;
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
    const rawResponse = await sendCommandAndWaitForResponse(new Uint8Array([0x08, 0x02, 0x07, 0x04, 0x01, 0x80])); // Persistant Store Load
    
    return textDecoder.decode(new Uint8Array(rawResponse.slice(3)));
};

const resetToDfu = async function () {
    await write(new Uint8Array([0x08, 0x01, 0x01, 0x01, 0x01])); // reset to DFU
    await new Promise(r => setTimeout(r, 2000)); // wait for the reset to happen
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

const resetToNormalMode = async function () {
    await write(new Uint8Array([0x08, 0x01, 0x00, 0x00, 0x00])); // reset to Normal mode
    await new Promise(r => setTimeout(r, 2000)); // wait for the reset to happen
};