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

!!! note "uart1 flow control"

    uart1 is configured with hardware handshake (`project.xml`), so the module only transmits BGAPI replies while its CTS line is asserted. On at least some boards (verified on an SR-02A) CTS floats when nothing drives it, and the module then receives commands but never answers. If BGAPI stays silent on P204, ground the third hole (any board ground, e.g. P102) while flashing or debugging, and remove that ground for normal operation.
