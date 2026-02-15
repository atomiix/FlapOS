const installBtn = document.getElementById('installBtn');
const consoleView = document.querySelector('#console code');
const versionSelect = document.querySelector('select[name="version"]');
const wiringLink = document.getElementById('wiring-link');
const wiring = document.getElementById('wiring');
const githubReleaseEndpoint = 'https://api.github.com/repos/atomiix/FlapOS/releases';
const awsReleaseBaseUrl = 'https://flapos-releases.s3.eu-west-3.amazonaws.com';

const fetchVersions = async function () {
    const releasesResponse = await fetch(githubReleaseEndpoint);
    return await releasesResponse.json();
};

const populateVersionSelect = async function () {
    const versions = await fetchVersions();
    let latest = true;
    const getVersionName = version => {
        let name = version.tag_name;
        if (version.prerelease === true) {
            name += ' (pre-release)';
        } else if (latest === true) {
            name += ' (latest)';
            latest = false;
        }

        return name;
    };

    versionSelect.innerHTML = '';

    for (let version of versions) {
        if (version.assets.length === 0 || version.draft === true) {
            continue;
        }
        const downloadUrl = `${awsReleaseBaseUrl}/${version.tag_name}/${version.assets[0].name}`
        versionSelect.innerHTML += `<option value="${downloadUrl}">${getVersionName(version)}</option>`;
    }

    versionSelect.disabled = false;
    installBtn.disabled = false;
};

populateVersionSelect();

const printToConsole = function (message) {
    consoleView.innerHTML += message;
    consoleView.scrollTop = consoleView.scrollHeight - consoleView.clientHeight;
};

const printlnToConsole = function (message) {
    printToConsole(`${message}<br>`);
};

const updateProgressBar = function (name, progress) {
    if (consoleView.querySelector(`#${name}`) === null) {
        printlnToConsole(`<span id="${name}"></span>`);
    }
    const ratio = Math.round(progress * 40 / 100);
    const p = ''.padStart(ratio, '#');
    const r = ''.padStart(40 - ratio, '-');
    consoleView.querySelector(`#${name}`).innerHTML = `[${p+r}]`;
};

const askForKeyPress = async function () {
    return new Promise(resolve => {
        const listener = e => {
            e.preventDefault();
            e.stopPropagation();
            resolve(e.key === 'y');
        };
        document.addEventListener('keypress', listener, { once: true, capture: true });
    });
};

installBtn.addEventListener('click', async function () {
    await connect();
    installBtn.disabled = true;

    const abort = async () => {
        printlnToConsole(' Aborted');
        await closePort();
        installBtn.disabled = false;
    };

    const fail = async (error) => {
        printlnToConsole(' FAILED');
        console.error(error);
        await closePort();
        installBtn.disabled = false;
    };

    let skipDfuReboot = false;

    consoleView.parentElement.style.display = 'block';
    printToConsole('Connected');
    await new Promise(r => setTimeout(r, 1000)); // wait for the readableStream to start

    while (true) {
        try {
            printlnToConsole('');
            printToConsole('Getting serial number... ');
            printlnToConsole(await getSerialNumber());
            break;
        } catch (error) {
            printlnToConsole('FAILED');
            if (await isStuckInDfu()) {
                printlnToConsole('Your device seems to be stuck in DFU mode.');
                printlnToConsole('This can happen if the flashing process failed.');
                skipDfuReboot = true;
                break;
            } else {
                printlnToConsole('Check your connections. Is your Flapit powered on?');
                printToConsole('Try again? (y/N)');
                if (await askForKeyPress() === false) {
                    return await abort();
                }
            }
        }
    }

    printToConsole('Proceed installation? (y/N)');
    if (await askForKeyPress() === false) {
        return await abort();
    }
    printlnToConsole('');

    printToConsole('Downloading firmware...');
    let firmware = null;
    try {
        const response = await fetch(versionSelect.options[versionSelect.selectedIndex].value);
        firmware = await response.arrayBuffer();
        printlnToConsole(' OK');
    } catch (error) {
        return await fail(error);
    }

    if (!skipDfuReboot) {
        printToConsole('Rebooting in DFU mode...');
        try {
            await resetToDfu();
            printlnToConsole(' OK');
        } catch (error) {
            return await fail(error);
        }
    }

    printlnToConsole('Flashing firmware DO NOT DISCONNECT!');
    const progressBarName = `flashing-progress-${Date.now()}`;
    updateProgressBar(progressBarName, 0);
    try {
        await flashFirmware(firmware, p => updateProgressBar(progressBarName, p));
    } catch (error) {
        return await fail(error);
    }

    printToConsole('Rebooting to normal mode...');
    try {
        await resetToNormalMode();
        printlnToConsole(' OK');
    } catch (error) {
        return await fail(error);
    }

    printToConsole('Sending hello command...');
    try {
        await hello();
        printlnToConsole(' OK');
        printToConsole('Closing serial port...');
        await closePort();
        printlnToConsole(' OK');
        printlnToConsole('Installation complete! 🎉');
        printlnToConsole('You can disconnect your USB-to-TTL device');
        installBtn.disabled = false;
    } catch (error) {
        // return await fail(error);
    }

});

wiringLink.addEventListener('click', function (e) {
    e.preventDefault();
    wiring.style.display = 'flex';
});

wiring.addEventListener('click', () => wiring.style.display = 'none');
