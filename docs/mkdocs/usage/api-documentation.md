## HTTP API

#### Endpoint

Depending on the mode you selected when configuring FlapOS, the endpoint to which you will send requests to is not the same.

| Mode            | Endpoint                                 | Comment |
|-----------------|------------------------------------------|---------|
| AP              | [http://192.168.1.1](http://192.168.1.1) |
| Server mode     | <ul><li>[http://FLP1-XXXXXXXXXX.local](http://FLP1-XXXXXXXXXX.local)</li><li>[http://your-FlapOS-ip](http://your-FlapOS-ip)</li></ul> | Replace `XXXXXXXXXX` with your serial number.<br>Example: `http://FLP1-1520009531.local` |
| Client mode     | [http://your-flapit-server-ip:3000](http://your-flapit-server-ip:3000) | Flapit-server default port is 3000.<br>Replace with it if you changed the default configuration |

#### Send message

To send a message to FlapOS, you need to send a HTTP request (using `curl` or equivalent).<br>

- In AP and Server mode, only the `message` key is required.<br>
- In Client mode, the `device` key is also required. Its value should be the device identifier (FLP1-XXXXXXXXXX, replace XXXXXXXXXX with the serial number).

Examples:

=== "AP"

    ``` bash
    curl -d message=":) FLAPOS" http://192.168.1.1
    ```

=== "Server mode"

    ``` bash
    curl -d message=":) FLAPOS" http://FLP1-1520009531.local
    ```

=== "Client mode"

    ``` bash
    curl -d message=":) FLAPOS" -d device="FLP1-1520009531" http://192.168.1.24
    ```

##### Message format

All the available characters are listed on [Flapit API documentation (symbols table)](https://www.flapit.com/fr/api.html#symbols-table)

!!! warning
    In AP and Server mode, the `message` value should be uppercase.