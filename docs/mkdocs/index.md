---
hide:
  - navigation
  - toc
  - path
---

# FlapOS

FlapOS is an [open-source custom firmware]{:target="_blank"} for **FlapIt**, a split-flap social counter.
It replaces the original firmware to provide more control by being independent of original Flapit servers.

##### Main features are:

- **Client mode** (same as the original firmware but you can choose which server to connect to. See [Flapit-server]{:target="_blank"})
- **Server mode** (you can contact the device directly on your network)
- **Access-Point mode** (you connect directly to the device)

## Getting started

### Flashing the firmware

!!! warning
    You will need an [USB to TTL converter]{:target="_blank"} converter to be able to flash the device.

1. Unscrew the 4 screws under the device
2. The glassy part should come loose
3. Gently pull the black frame while you lift the white box all around
4. The [motherboard](./hardware/motherboard.md) is at the back 
5. Prepare your USB to TTL converter and follow the instructions on the [Web Flasher](./web-flasher/)



### Documentation

- You can read how to setup FlapOS once flashed [here](./usage/setup.md).
- Discover [how to send command](./usage/api-documentation.md) to FlapOS.
- Learn more about [Flapit hardware](./hardware/motherboard.md).

[USB to TTL converter]: https://www.google.com/search?q=USB+to+TTL+converter
[open-source custom firmware]: https://github.com/atomiix/FlapOS
[Flapit-server]: https://github.com/atomiix/Flapit-server