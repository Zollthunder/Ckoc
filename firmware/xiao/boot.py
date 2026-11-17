# A XIAO két USB soros portot ad: konzol (hibakereséshez) és data (a Pi ezen küldi/kapja a JSON-üzeneteket)
import usb_cdc
usb_cdc.enable(console=True, data=True)
