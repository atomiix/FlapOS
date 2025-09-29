> [!CAUTION]
> This is a work in progress!

# FlapOS

**FlapOS is an alternative firmware for [Flapit devices](https://flapit.com).**

The main features are:
- **Compatibility mode** (same as the original firmware but you can choose which server to connect to. See [Flapit-server](https://github.com/atomiix/Flapit-server))
- **Server mode** (you can contact the device directly on your network)
- **Access-Point mode** (you connect directly to the device)

## How to build
On Windows:

```sh
bgbuild.exe project.xml
```

On Linux/MacOS with Wine:
```sh
wine bgbuild.exe project.xml
```

## How to flash
```sh
java -jar /Applications/microchip/mplabx/v6.20/mplab_platform/mplab_ipe/ipecmd.jar -P32MX695F512H -TPPK3 -M -Fflap_os.hex -OL
```