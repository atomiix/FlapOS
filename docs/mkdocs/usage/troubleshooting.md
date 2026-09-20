## Common issues

??? note "I setup FlapOS but I can’t reach it"

    If FlapOS cannot successfuly connect to your Wi-Fi network (e.g. because of a wrong password), it will reboot back into configuration mode, you should be able to reconnect to it Wi-Fi network and configure it again.

??? note "How can I reset or change the mode?"

    Long press on the RESET button, FlapOS will reboot back into configuration mode.

??? note "I can’t associate using the WPS button"
    
    This feature is not implemented in the current version of the firmware. See [Setup](./setup.md) to know how to connect to your Wi-Fi network.

??? note "The FlapOS Wi-Fi network is visible but nothing can join it"

    The Wi-Fi radio keeps broadcasting the network name in hardware even if the firmware has stopped running, so a visible SSID does not prove the device is alive. If every join attempt fails and the status led is off, power-cycle the Flapit (unplug, wait ~30 seconds, plug back in) and wait for the led before retrying.

??? note "The led is solid green, my phone joins and gets an address, but every message times out (FlapOS 1.0.0)"

    The FlapOS application has stalled while the Wi-Fi stack keeps running. A solid led is set once and never updated, so it stays green through a hang. On FlapOS 1.0.0 this could be caused by a floating CTS line on uart1; see the flow control note on the [Pinout](../hardware/pinout.md) page. Updating to 1.0.1 or later removes the cause. Power-cycle to recover.


## LEDs signification

#### Configuration mode

In configuration mode, the led will blink orange while scanning the available Wi-Fi and then stop blinking when ready to be configured.
Once configured, the led will blink blue while trying to connect to the Wi-Fi.

#### Client mode

In client mode, the led will then blink green while trying to connect to the server ([flapit-server]{:target="_blank"}) and then stop blinking once connected.

#### Server mode
In server mode, the led will turn green as soon as the Flapit is connected to the Wi-Fi.


#### Error

If the Flapit gets disconnected for any reason, the led will blink orange fast and try to reconnect to the Wi-Fi every 5 seconds.

[flapit-server]: https://github.com/atomiix/flapit-server

## Flashing a crashed stock unit

Most stock Flapits can be flashed with the [Web Flasher](../web-flasher/index.md). Some units have a stock firmware that crashes during boot, and on those the Web Flasher cannot even read the serial number. This is the recovery method that worked on such a unit (serial batch 1520-002xxx, full investigation in [issue #7](https://github.com/atomiix/FlapOS/issues/7)).

#### How to recognize this case

- The Web Flasher connects to the serial port but fails at "Getting serial number".
- On the uart0 console (P201, 115200) the stock firmware prints its banner and then stops, before the `[Info.][No stored error.]` line.
- The buttons do nothing, no led lights up, no setup Wi-Fi appears, and the flaps never run their power-on dance.

The chip is usually fine. The trick is that **the BGAPI stack still listens for a short window (roughly 1 to 3 seconds) right after power-up**, before the crashed application takes over. Everything below builds on that window.

#### Wiring

Same wiring as the Web Flasher: uart1 on P204 (see [Pinout](../hardware/pinout.md)), 115200 baud. The DFU bootloader does not use flow control, so the usual three wires are enough. If you never see the DFU boot event after several power cycles, try grounding P204 hole 3 (see the flow control note on the Pinout page) and retry.

#### The boot-window method

A ready-to-use script is in [`tools/catch_and_flash.py`](https://github.com/atomiix/FlapOS/blob/main/tools/catch_and_flash.py) (Python 3, macOS or Linux, no extra packages). Run it, then power-cycle the Flapit every ~10 seconds until it reports the DFU boot event, and it does the rest:

```
python3 tools/catch_and_flash.py --port /dev/cu.usbserial-XXXX --file flap_os.dfu --yes
```

What it does, if you prefer to do it by hand:

1. Open the serial port once and **keep it open for the whole procedure**. Closing and reopening it costs you the boot window, and on some adapters the port open/close itself pulses the TX line and confuses the parser.
2. Send `system_reset(dfu=1)` (`08 01 01 01 01`) in a loop, 20 to 50 times per second.
3. Power-cycle the Flapit every ~10 seconds until the DFU boot event (`88 04 00 00 ...`) comes back. That means the chip rebooted into the DFU bootloader, which ignores the application and the persistent store entirely.
4. On the same open port: `dfu_flash_set_address(0)`, then upload `flap_os.dfu` in chunks.
5. Finish with `dfu_flash_upload_finish`, then `dfu_reset(0)` to boot the new firmware.

Two gotchas found the hard way:

!!! danger "Do not send `dfu_reset(0)` to a chip that is already in DFU"

    It reboots the chip into normal mode, so it kicks it *out* of DFU and you have to catch the boot window again. Only send it at the very end, after `upload_finish`. Nothing is erased if this happens; you just start over.

!!! tip "Pace the upload"

    A full-speed upload can outrun the chip's receive buffer (on the tested unit it stalled around offset 43k). Waiting ~6 ms between chunks and retrying a chunk when its ack does not arrive made the upload complete reliably: 512,000 bytes in about 4 minutes, every chunk acknowledged. The script does this by default.

The persistent store (serial number, factory password, MAC) survives this method: the DFU image covers the program flash only.

#### Test mode

Holding **WPS + RESET while applying power** boots the stock firmware into a test mode that skips part of the normal boot. On a crashed unit this is a way to prove the chip and buttons still work: the console prints `[DBG][Wi-Fi][Test mode]` and button presses print `[DBG][WPS button pressed]` / `[DBG][AD-HOC button pressed]`. Wire everything *before* powering up and do not touch the wires afterwards; entry can take several attempts on a misbehaving unit.
