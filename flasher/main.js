const installBtn = document.getElementById('installBtn');
const consoleView = document.getElementById('console');
const versionSelect = document.querySelector('select[name="version"]');
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

const askForKeyPress = async function () {
    return new Promise(resolve => {
        const listener = e => {
            resolve(e.key === 'y');
            document.removeEventListener('keypress', listener);
        };
        document.addEventListener('keypress', listener);
    });
};

installBtn.addEventListener('click', async function () {
    await connect();
    installBtn.disabled = true;

    consoleView.style.display = 'block';
    try {
        printlnToConsole('Connected');
        await new Promise(r => setTimeout(r, 1000)); // wait for the readableStream to start
        printToConsole('Getting serial number... ');
        printlnToConsole(await getSerialNumber())
        printToConsole('Proceed installation? (y/N)');
        if (await askForKeyPress() === false) {
            printlnToConsole(' Aborted');
            await closePort();
            installBtn.disabled = false;
            return;
        }
        printlnToConsole('');
    } catch (error) {
        printlnToConsole('FAILED');
        return;
    }

    printToConsole('Downloading firmware...');
    try {
        const response = await fetch(versionSelect.options[versionSelect.selectedIndex].value);
        const firmware = await response.arrayBuffer();
        printlnToConsole(' OK');
    } catch (error) {
        printlnToConsole(' FAILED');
        console.error(error);
        return;
    }

    printlnToConsole('Rebooting in DFU mode...');
    await resetToDfu();

    printlnToConsole('Flashing firmware DO NOT DISCONNECT!');
    printToConsole('0%... ');

    let progress = 0;
    const updateCallback = function (p) {
        if (Math.round(p / 5) > progress) {
            progress = Math.round(p / 5);
            printToConsole(`${progress*5}%... `);
        }
    };
    try {
        await flashFirmware(firmware, updateCallback);
    } catch (e) {
        console.error(e);
        printlnToConsole('ERROR');
        return;
    }

    printlnToConsole('');
    printlnToConsole('Rebooting to normal mode...');
    await resetToNormalMode();

    try {
        printToConsole('Sending hello command...');
        await hello();
        printlnToConsole(' OK');
        printToConsole('Closing serial port...');
        await closePort();
        printlnToConsole(' OK');
        printlnToConsole('Installation complete! 🎉');
    } catch (error) {
        console.log(error);
        printlnToConsole(' FAILED');
    } finally {
        installBtn.disabled = false;
    }
});