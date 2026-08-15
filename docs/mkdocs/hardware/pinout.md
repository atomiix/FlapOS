### LEDs

| LED    | PIN | GPIO |
|--------|-----|------|
| Blue   | 21  | RB12 |
| Green  | 20  | RB13 |
| Orange | 2   | RB15 |

### Buttons

| Button | PIN | GPIO  |
|--------|-----|-------|
| Reset  | 38  | RD0   |
| Reset  | 37  | RD11  |

### Motors

| Motor | PIN | GPIO |
|-------|-----|------|
| 1     | 22  | RD11 |
| 2     | 39  | RD4  |
| 3     | 41  | RD5  |
| 4     | 42  | RD6  |
| 5     | 43  | RD7  |
| 6     | 44  | RD9  |
| 7     | 46  | RD10 |

### Switches

| Switch | PIN | GPIO |
|--------|-----|------|
| 1      | 6   | RE3  |
| 2      | 5   | RE2  |
| 3      | 4   | RE1  |
| 4      | 3   | RE0  |
| 5      | 7   | RE4  |
| 6      | 10  | RE5  |
| 7      | 11  | RE6  |

### I/O

| Type                     | Name on board | Comment                                | Image            |
|--------------------------|---------------|----------------------------------------|------------------|
| ICSP (PicKit3 connector) | P200          | Pin1 is the square one (on the right)  | ![](./ICSP.png)  |
| uart0                    | P201          | (From top to bottom) GND, RX, TX, 3.3V | ![](./uart0.png) |
| uart1                    | P204          | (From left to right) RX, TX, CTS       | ![](./uart1.png) |

!!! warning "uart1 flow control: keep CTS grounded"

    uart1 is configured with hardware handshake (`project.xml`), so the module only transmits BGAPI replies while its CTS line is asserted. On at least some boards (verified on an SR-02A) CTS floats when nothing drives it. Two consequences:

    - **While flashing or debugging**, a floating CTS means the module receives your commands but never answers, which looks exactly like a dead port. If BGAPI stays silent on P204, ground the third hole.
    - **During normal operation**, a floating CTS can hang FlapOS. The symptom is misleading: the Wi-Fi stack keeps running, so the device still beacons its SSID and still hands out DHCP addresses, and the status led stays solid green, but the web server never answers a request. It reads as a network problem and is actually a stalled application.

    On the unit where this was found, the fault was intermittent for weeks. A hand held an inch above the board was enough to trigger it, as was the vibration of the flaps turning. Cutting the debug wires off did not fix it; only a permanent solder link from the third hole to ground did. If your board shows unexplained hangs, ground that pin and leave it grounded.
