1. Connect to the Wi-Fi network FlapOS_xxxxxxxxxx.
2. You should automatically see the FlapOS configuration window. If it doesn’t appear after a few seconds, open a browser and go to [http://flapos.setup/](http://flapos.setup/)
    
    !!! tip
        If a custom DNS has been configured on your computer/smartphone, you might face issues trying to connect to FlapOS.

3. Select the [mode](#modes) as described bellow
4. See [API documentation](./api-documentation.md) to know more about how to send messages to your FlapOS device.

### Modes

#### AP (standalone)

In this mode, FlapOS will generate an Wi-Fi access point that you can connect to.
!!! warning
    This mode exists only because it was quite easy to add but there is no good reason to use it.<br>
    There is no real pros, and here are some cons:<br>
    
    - Once connected to it, you will not have access to internet because FlapOS is not a router
    - You can have only 1 device connected to your FlapOS (this could be changed, but there is no reason to do so)

#### Server mode

Server mode works the same way as AP, but instead of connecting directly to it, FlapOS will connect to the network and will play the role of a web server.

!!! success "👍"
    This mode is the easiest to setup as you will not need a separate server to be up and running.

!!! warning
    Please do not expose your FlapOS device publicly on the internet. If you want to control FlapOS from outside your local network, configure FlapOS in Client mode and use [Flapit-server](https://github.com/atomiix/Flapit-server)

#### Client mode (original mode)

This mode works the same way as the original firmware except that you are able to set to which endpoint FlapOS should try to connect to.<br>
!!! warning
    You will need an instance of [Flapit-server](https://github.com/atomiix/Flapit-server) up and running.

!!! tip
    This was the initial reason why this firmware was started: being able to connect to a different endpoint than `hub.flapit.com`. This endpoint is hardcoded in the original firmware, forcing us to find [workarounds](https://github.com/atomiix/Flapit-server?tab=readme-ov-file#%EF%B8%8F-dns-workaround) to redirect where we wanted.