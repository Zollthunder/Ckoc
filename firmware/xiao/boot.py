# A Pi-vel UART-on beszél (D6/D7, lásd code.py), az USB csak táp nélküli hibakereséshez kell: konzol igen, data nem.
import usb_cdc
usb_cdc.enable(console=True, data=False)
