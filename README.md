# FlapOS

***FlapOS is an alternative firmware for [Flapit devices](https://flapit.com).***

Main features are:
- **Compatibility mode** (same as the original firmware but you can choose which server to connect to. See [Flapit-server](https://github.com/atomiix/Flapit-server))
- **Server mode** (you can contact the device directly on your network)
- **Access-Point mode** (you connect directly to the device)

## How to build

> [!TIP]
> You don’t need to build it if you only want to install a pre-compiled version.<br>
> See [How to flash](#how-to-flash) section below

> [!NOTE]
>You can find the bgbuild.exe binary by downloading and installing WF121 Wi-Fi Software and SDK available on [Silabs website](https://www.silabs.com/software-and-tools/bluegiga-wi-fi-software-stack?tab=documentation)

On Windows:

```sh
bgbuild.exe project.xml
```

On Linux/MacOS with Wine:
```sh
wine bgbuild.exe project.xml
```

## How to flash

### Using the webflasher (prefered method)

The webflasher is available at [https://atomiix.github.io/FlapOS](https://atomiix.github.io/FlapOS).
You can follow the instructions here.

### Using cli with a PicKit3

> [!CAUTION]
> This method will erase the mac address, the serial number and the factory password used for associating your device to flapit.com<br>
> Learn more [here](https://community.silabs.com/s/article/x-how-to-retain-mac-address-on-wf121-module-when-reflashing-via-pickit3-icsp?language=en_US)

> [!NOTE]
> You need java and [MPLAB X IDE](https://www.microchip.com/en-us/tools-resources/develop/mplab-x-ide) in order to flash your device using cli

Run the following command in your terminal:

```sh
java -jar /Applications/microchip/mplabx/v6.20/mplab_platform/mplab_ipe/ipecmd.jar -P32MX695F512H -TPPK3 -M -Fflap_os.hex -OL
```