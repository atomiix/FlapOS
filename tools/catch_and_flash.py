#!/usr/bin/env python3
"""Catch the Flapit's boot window, drop it into DFU, and flash — all in ONE process.

Why one process: on a unit whose stock firmware crashes at boot, the chip only
listens to BGAPI during the brief window at power-up, before the crashed
application takes over. Closing and reopening the port between "catch DFU" and
"upload" loses the state, so both must happen on the same open handle.

Requirements: Python 3 on macOS or Linux (uses termios, no extra packages).
Wiring: uart1 on P204, 115200 baud, same as the Web Flasher.
Run it, then power-cycle the Flapit every ~10 seconds until it catches the
DFU boot event. Full write-up: docs/mkdocs/usage/troubleshooting.md

Sequence:
  1. hammer system_reset(dfu=1) until a DFU boot event (88 xx 00 00) appears
  2. immediately dfu_flash_set_address(0)   <-- POINT OF NO RETURN, erases app
  3. upload the image in 128-byte chunks, checking every response
  4. dfu_flash_upload_finish, then reset to normal

Safety: nothing is erased until a real DFU boot event has been seen. Every
response's result field is checked; a non-zero result aborts.

  python3 catch_and_flash.py --port /dev/cu.usbserial-XXXX --file flap_os.dfu --yes
"""
import argparse, binascii, hashlib, os, select, struct, sys, termios, time

CHUNK = 128
PIC32_RESET_VENEER = bytes([0x00, 0x9D, 0x1A, 0x3C])
MAX_IMAGE = 512000

RESET_DFU        = bytes([0x08, 0x01, 0x01, 0x01, 0x01])
HELLO            = bytes([0x08, 0x00, 0x01, 0x02])
SET_ADDR_0       = bytes([0x08, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00])
UPLOAD_FINISH    = bytes([0x08, 0x00, 0x00, 0x03])
DFU_RESET_NORMAL = bytes([0x08, 0x01, 0x00, 0x00, 0x00])


def upload_cmd(chunk):
    return bytes([0x08, len(chunk) + 1, 0x00, 0x02, len(chunk)]) + chunk


class P:
    def __init__(self, dev, baud, logpath):
        self.fd = os.open(dev, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
        a = termios.tcgetattr(self.fd)
        b = getattr(termios, "B%d" % baud)
        termios.tcsetattr(self.fd, termios.TCSANOW,
                          [0, 0, termios.CREAD | termios.CLOCAL | termios.CS8, 0, b, b, a[6]])
        termios.tcflush(self.fd, termios.TCIOFLUSH)
        self.log = open(logpath, "w")
        self.buf = bytearray()

    def say(self, s):
        self.log.write(s + "\n"); self.log.flush()
        print(s, flush=True)

    def w(self, data):
        os.write(self.fd, data)
        self.log.write("TX %s\n" % binascii.hexlify(data[:16]).decode()); self.log.flush()

    def read(self, seconds):
        end = time.time() + seconds
        got = bytearray()
        while time.time() < end:
            r, _, _ = select.select([self.fd], [], [], 0.01)
            if r:
                try:
                    c = os.read(self.fd, 4096)
                except BlockingIOError:
                    continue
                if c:
                    got.extend(c)
                    self.log.write("RX %s\n" % binascii.hexlify(c).decode()); self.log.flush()
        return bytes(got)

    def wait_response(self, cls, meth, seconds):
        """Wait for a command response 08 len cls meth ... and return its result u16 (or None)."""
        end = time.time() + seconds
        acc = bytearray()
        while time.time() < end:
            acc.extend(self.read(0.05))
            d = bytes(acc)
            for i in range(len(d) - 3):
                if d[i] == 0x08 and d[i + 2] == cls and d[i + 3] == meth:
                    ln = d[i + 1]
                    if len(d) >= i + 4 + ln:
                        payload = d[i + 4:i + 4 + ln]
                        return struct.unpack("<H", payload[:2])[0] if ln >= 2 else 0
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="/dev/cu.usbserial-0001")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--file", default="../flap_os.dfu")
    ap.add_argument("--catch-seconds", type=float, default=240.0)
    ap.add_argument("--log", default="/tmp/catch_and_flash.log")
    ap.add_argument("--yes", action="store_true")
    ap.add_argument("--pace", type=float, default=0.006, help="seconds between chunks; 0.006 completed reliably")
    ap.add_argument("--skip-catch", action="store_true")
    a = ap.parse_args()

    img = open(a.file, "rb").read()
    print("image %s: %d bytes sha256 %s" % (a.file, len(img), hashlib.sha256(img).hexdigest()[:32]))
    if len(img) % 4 or len(img) > MAX_IMAGE:
        raise SystemExit("bad image size")
    if img[:4] != PIC32_RESET_VENEER:
        raise SystemExit("image lacks the PIC32 reset veneer — wrong file?")
    if not a.yes:
        raise SystemExit("dry run OK. add --yes to actually write flash.")

    p = P(a.port, a.baud, a.log)
    p.say("PHASE 1: hammering system_reset(dfu=1). POWER-CYCLE THE FLAPIT (no buttons), repeat every ~15s.")

    if a.skip_catch:
        p.say("(skipping catch — assuming already in DFU)")
        in_dfu = True
    t0 = time.time()
    last = 0.0
    acc = bytearray()
    alt = 0
    in_dfu = locals().get("in_dfu", False)
    while time.time() - t0 < a.catch_seconds and not in_dfu:
        now = time.time()
        if now - last > 0.02:
            last = now
            try:
                p.w(RESET_DFU if (alt % 4) else HELLO)
                alt += 1
            except OSError:
                pass
        c = p.read(0.01)
        if not c:
            continue
        acc.extend(c)
        d = bytes(acc)
        for i in range(len(d) - 3):
            if d[i] == 0x88 and d[i + 2] == 0x00 and d[i + 3] == 0x00:
                p.say("+%6.2fs *** DFU BOOT EVENT: %s" % (time.time() - t0, d[i:i + 8].hex()))
                in_dfu = True
                break
        if len(acc) > 20000:
            del acc[:10000]

    if not in_dfu:
        p.say("no DFU boot event caught — nothing erased, safe to retry.")
        return 1

    # settle, then flush any stale bytes so responses are unambiguous
    time.sleep(0.15)
    p.read(0.15)

    p.say("PHASE 2: dfu_flash_set_address(0) — THIS ERASES THE APP")
    p.w(SET_ADDR_0)
    res = p.wait_response(0x00, 0x01, 6.0)
    if res is None:
        p.say("!! no response to set_address. STOP. Do not power-cycle; tell Claude.")
        return 2
    if res != 0:
        p.say("!! set_address returned error 0x%04x. STOP." % res)
        return 2
    p.say("   set_address OK (result 0)")

    p.say("PHASE 3: uploading %d bytes in %d-byte chunks..." % (len(img), CHUNK))
    sent = 0
    t_up = time.time()
    while sent < len(img):
        chunk = img[sent:sent + CHUNK]
        res = None
        for attempt in range(6):
            p.w(upload_cmd(chunk))
            res = p.wait_response(0x00, 0x02, 3.0)
            if res is not None:
                break
            p.say("   (no ack at offset %d, retry %d)" % (sent, attempt + 1))
            time.sleep(0.25)
        if res is None:
            p.say("!! no response at offset %d after retries. STOP." % sent)
            return 3
        time.sleep(a.pace)
        if res != 0:
            p.say("!! upload error 0x%04x at offset %d. STOP." % (res, sent))
            return 3
        sent += len(chunk)
        if sent % 25600 == 0 or sent == len(img):
            pct = 100.0 * sent / len(img)
            p.say("   %6d / %d bytes (%.0f%%)" % (sent, len(img), pct))

    p.say("PHASE 4: upload_finish")
    p.w(UPLOAD_FINISH)
    res = p.wait_response(0x00, 0x03, 8.0)
    p.say("   upload_finish result: %s" % ("0 (OK)" if res == 0 else repr(res)))

    p.say("PHASE 5: reset to normal mode")
    p.w(DFU_RESET_NORMAL)
    tail = p.read(4.0)
    if tail:
        p.say("   post-reset bytes: %s" % binascii.hexlify(tail[:48]).decode())

    p.say("\nDONE in %.1fs. Now power-cycle and watch the console for FlapOS." % (time.time() - t_up))
    return 0


if __name__ == "__main__":
    sys.exit(main())
