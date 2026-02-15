## Common issues

??? note "I setup FlapOS but I can’t reach it"

    If FlapOS cannot successfuly connect to your Wi-Fi network (e.g. because of a wrong password), it will reboot back into configuration mode, you should be able to reconnect to it Wi-Fi network and configure it again.

??? note "How can I reset or change the mode?"

    Long press on the RESET button, FlapOS will reboot back into configuration mode.

??? note "I can’t associate using the WPS button"
    
    This feature is not implemented in the current version of the firmware. See [Setup](./setup.md) to know how to connect to your Wi-Fi network.


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