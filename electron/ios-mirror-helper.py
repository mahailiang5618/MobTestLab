#!/usr/bin/env python3
"""iOS screenshot polling helper for MobTestLab.

Continuously captures screenshots via pymobiledevice3 ScreenshotService
and writes length-prefixed JPEG frames to stdout.

Binary protocol: [4 bytes uint32 LE frame_length][JPEG bytes]
Startup handshake: single 0x00 byte when ready
"""

import argparse
import asyncio
import io
import struct
import sys

from PIL import Image
from pymobiledevice3 import usbmux
from pymobiledevice3.lockdown import create_using_usbmux
from pymobiledevice3.services.screenshot import ScreenshotService


async def poll_screenshots(udid: str, fps: int) -> None:
    device = await usbmux.select_device(udid)
    lockdown = create_using_usbmux(udid=device.serial)
    service = ScreenshotService(lockdown=lockdown)

    interval = 1.0 / fps

    # Signal ready to parent process
    sys.stdout.buffer.write(b'\x00')
    sys.stdout.buffer.flush()

    while True:
        try:
            png_data = await service.take_screenshot()
            img = Image.open(io.BytesIO(png_data))
            jpeg_buf = io.BytesIO()
            img.save(jpeg_buf, format='JPEG', quality=85)
            jpeg_data = jpeg_buf.getvalue()

            frame = struct.pack('<I', len(jpeg_data)) + jpeg_data
            sys.stdout.buffer.write(frame)
            sys.stdout.buffer.flush()
        except Exception as e:
            err_bytes = str(e).encode('utf-8')
            sys.stdout.buffer.write(struct.pack('<I', 0))
            sys.stdout.buffer.write(struct.pack('<I', len(err_bytes)))
            sys.stdout.buffer.write(err_bytes)
            sys.stdout.buffer.flush()

        await asyncio.sleep(interval)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='iOS screenshot polling helper')
    parser.add_argument('--udid', required=True, help='Device UDID')
    parser.add_argument('--fps', type=int, default=8, help='Capture FPS (default: 8)')
    args = parser.parse_args()

    asyncio.run(poll_screenshots(args.udid, args.fps))
