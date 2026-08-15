# Flashing a crashed stock unit

Most stock Flapits can be flashed with the [Web Flasher](../web-flasher/index.md). But some units have a stock firmware that crashes during boot, and on those the Web Flasher cannot even read the serial number. This page documents a recovery method that worked on such a unit (serial batch 1520-002xxx, see [issue #7](https://github.com/atomiix/FlapOS/issues/7) for the full investigation).

## How to recognize this case

- The Web Flasher connects to the serial port but fails at "Getting serial number".
- On the uart0 console (P201, 115200) the stock firmware prints its banner and then stops, before the `[Info.][No stored error.]` line.
- The buttons do nothing, no LEDs light up, no setup Wi-Fi appears, and the flaps never run their power-on dance.

The chip is usually fine. The trick is that **the BGAPI stack still listens for a short window (roughly 1 to 3 seconds) right after power-up**, before the crashed application takes over. Everything below builds on that window.

## Wiring

Same wiring as the Web Flasher: uart1 on P204 (see [Pinout](../hardware/pinout.md)), 115200 baud.

!!! warning "Ground P204 hole 3 to hear the chip"

    uart1 uses hardware flow control. The third hole of P204 is the module's CTS line: if it floats, the module receives your commands but can never transmit a reply, which looks exactly like a dead port. Ground hole 3 (any board ground works, e.g. P102) while talking BGAPI.

    Leave it grounded afterwards. A floating CTS can also hang FlapOS during normal operation, and it is worth reading the [Pinout](../hardware/pinout.md) note before you disconnect anything.

## The boot-window method

1. Open the serial port once and **keep it open for the whole procedure**. Closing and reopening it costs you the boot window, and on some adapters the port open/close itself pulses the TX line and confuses the parser.
2. Send `system_reset(dfu=1)` (`08 01 01 01 01`) in a loop, 20 to 50 times per second.
3. Power-cycle the Flapit every ~10 seconds until you see the DFU boot event (`88 04 00 00 ...`) come back. That means the chip rebooted into the DFU bootloader, which ignores the application and the persistent store entirely.
4. On the same open port: `dfu_flash_set_address(0)`, then upload `flap_os.dfu` in chunks.
5. Finish with `dfu_flash_upload_finish`, then `dfu_reset(0)` to boot the new firmware.

Two gotchas found the hard way:

!!! danger "Do not send `dfu_reset(0)` to a chip that is already in DFU"

    It reboots the chip into normal mode, i.e. it kicks it *out* of DFU and you have to catch the boot window again. Only send it at the very end, after `upload_finish`. Nothing is erased if this happens; you just start over.

!!! tip "Pace the upload"

    A full-speed upload can outrun the chip's receive buffer (on the tested unit it stalled around offset 43k). Waiting ~6 ms between chunks and retrying a chunk when its ack does not arrive made the upload complete reliably: 512,000 bytes in about 4 minutes, every chunk acknowledged.

The persistent store (serial number, factory password, MAC) survives this method: the DFU image covers the program flash only.

## Test mode (also undocumented elsewhere)

Holding **WPS + RESET while applying power** boots the stock firmware into a test mode that skips part of the normal boot. On a crashed unit this can be a way to prove the chip and buttons still work: the console prints `[DBG][Wi-Fi][Test mode]` and button presses print `[DBG][WPS button pressed]` / `[DBG][AD-HOC button pressed]`. Wire everything *before* powering up and do not touch the wires afterwards; entry can take several attempts on a misbehaving unit.
