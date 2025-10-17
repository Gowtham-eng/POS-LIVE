"""
Thermal Printer Server for Rugtek RP326
Handles ESC/POS printing via USB or Network
"""
import usb.core
import usb.util
import socket
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import logging

app = FastAPI(title="Thermal Printer Service")

# CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ESC/POS Commands
ESC = b'\x1b'
GS = b'\x1d'

class ESCPOSCommands:
    """ESC/POS command constants for thermal printer"""
    INIT = ESC + b'@'                    # Initialize printer
    ALIGN_CENTER = ESC + b'a' + b'\x01'  # Center alignment
    ALIGN_LEFT = ESC + b'a' + b'\x00'    # Left alignment
    BOLD_ON = ESC + b'E' + b'\x01'       # Bold text on
    BOLD_OFF = ESC + b'E' + b'\x00'      # Bold text off
    DOUBLE_HEIGHT = ESC + b'!' + b'\x10' # Double height text
    DOUBLE_WIDTH = ESC + b'!' + b'\x20'  # Double width text
    NORMAL = ESC + b'!' + b'\x00'        # Normal text
    CUT_PAPER = GS + b'V' + b'\x00'      # Full cut
    FEED_LINE = b'\n'                    # Line feed
    
class PrinterConfig:
    """Printer configuration"""
    # USB Vendor and Product IDs for Rugtek RP326
    USB_VENDOR_ID = 0x0fe6   # Rugtek vendor ID (may vary)
    USB_PRODUCT_ID = 0x811e  # RP326 product ID (may vary)
    
    # Network config (if using network printer)
    NETWORK_IP = "192.168.1.100"  # Change to your printer's IP
    NETWORK_PORT = 9100

class ReceiptData(BaseModel):
    billNumber: str
    customerName: str
    customerId: str
    createdBy: str
    date: str
    time: str
    items: List[dict]
    location: Optional[str] = "Refex Nungambakkam"

class PrinterConnection:
    """Handles connection to thermal printer"""
    
    def __init__(self):
        self.usb_device = None
        self.network_socket = None
        self.connection_type = None
        
    def connect_usb(self):
        """Connect to USB printer"""
        try:
            # Find the USB device
            device = usb.core.find(
                idVendor=PrinterConfig.USB_VENDOR_ID,
                idProduct=PrinterConfig.USB_PRODUCT_ID
            )
            
            if device is None:
                # Try to find any thermal printer
                device = usb.core.find(custom_match=lambda d: 
                    d.bDeviceClass == 7 or  # Printer class
                    (d.idVendor == 0x0fe6)  # Rugtek vendor
                )
            
            if device is None:
                logger.error("USB printer not found")
                return False
            
            # Detach kernel driver if active
            if device.is_kernel_driver_active(0):
                try:
                    device.detach_kernel_driver(0)
                except Exception as e:
                    logger.warning(f"Could not detach kernel driver: {e}")
            
            # Set configuration
            device.set_configuration()
            
            # Get endpoint
            cfg = device.get_active_configuration()
            intf = cfg[(0, 0)]
            
            self.usb_device = device
            self.connection_type = "USB"
            logger.info("Connected to USB printer successfully")
            return True
            
        except Exception as e:
            logger.error(f"USB connection failed: {e}")
            return False
    
    def connect_network(self, ip: str = None, port: int = 9100):
        """Connect to network printer"""
        try:
            ip = ip or PrinterConfig.NETWORK_IP
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            sock.connect((ip, port))
            
            self.network_socket = sock
            self.connection_type = "Network"
            logger.info(f"Connected to network printer at {ip}:{port}")
            return True
            
        except Exception as e:
            logger.error(f"Network connection failed: {e}")
            return False
    
    def send(self, data: bytes):
        """Send data to printer"""
        try:
            if self.connection_type == "USB" and self.usb_device:
                # Find OUT endpoint
                cfg = self.usb_device.get_active_configuration()
                intf = cfg[(0, 0)]
                ep = usb.util.find_descriptor(
                    intf,
                    custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_OUT
                )
                
                if ep:
                    ep.write(data)
                    return True
                    
            elif self.connection_type == "Network" and self.network_socket:
                self.network_socket.sendall(data)
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Send failed: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from printer"""
        if self.network_socket:
            self.network_socket.close()
        self.usb_device = None
        self.network_socket = None
        self.connection_type = None

# Global printer connection
printer = PrinterConnection()

def format_receipt(data: ReceiptData) -> bytes:
    """Format receipt data into ESC/POS commands"""
    cmd = ESCPOSCommands
    receipt = b''
    
    # Initialize printer
    receipt += cmd.INIT
    
    # Header - Center aligned, bold
    receipt += cmd.ALIGN_CENTER + cmd.BOLD_ON
    receipt += b'KITCHEN PRINT' + cmd.FEED_LINE
    receipt += data.location.encode('utf-8') + cmd.FEED_LINE
    receipt += cmd.DOUBLE_HEIGHT
    receipt += f'***Bill No. - {data.billNumber}***'.encode('utf-8') + cmd.FEED_LINE
    receipt += cmd.NORMAL + cmd.BOLD_OFF
    
    # Separator
    receipt += b'================================' + cmd.FEED_LINE
    
    # Customer info - Left aligned
    receipt += cmd.ALIGN_LEFT
    receipt += f'Customer: {data.customerName}'.encode('utf-8') + cmd.FEED_LINE
    receipt += f'ID: {data.customerId}'.encode('utf-8') + cmd.FEED_LINE
    receipt += f'Created by: {data.createdBy}'.encode('utf-8') + cmd.FEED_LINE
    receipt += f'DATE: {data.date}  TIME: {data.time}'.encode('utf-8') + cmd.FEED_LINE
    
    # Separator
    receipt += b'================================' + cmd.FEED_LINE
    
    # Items header - Bold
    receipt += cmd.BOLD_ON
    receipt += b'Item Name              QTY' + cmd.FEED_LINE
    receipt += b'--------------------------------' + cmd.FEED_LINE
    receipt += cmd.BOLD_OFF
    
    # Items
    for item in data.items:
        name = item['name'].upper()[:22].ljust(22)
        qty = str(item['quantity']).rjust(4)
        receipt += f'{name} {qty}'.encode('utf-8') + cmd.FEED_LINE
    
    # Separator
    receipt += b'================================' + cmd.FEED_LINE
    receipt += cmd.FEED_LINE
    
    # Footer - Center aligned
    receipt += cmd.ALIGN_CENTER
    receipt += cmd.BOLD_ON
    receipt += b'Thank you!' + cmd.FEED_LINE
    receipt += cmd.BOLD_OFF
    receipt += b'Powered by Refex POS System' + cmd.FEED_LINE
    receipt += cmd.FEED_LINE + cmd.FEED_LINE + cmd.FEED_LINE
    
    # Cut paper
    receipt += cmd.CUT_PAPER
    
    return receipt

@app.post("/api/print/receipt")
async def print_receipt(data: ReceiptData):
    """Print receipt to thermal printer"""
    try:
        # Try to connect if not connected
        if not printer.connection_type:
            # Try USB first
            if not printer.connect_usb():
                # Try network as fallback
                if not printer.connect_network():
                    raise HTTPException(
                        status_code=503,
                        detail="Printer not connected. Please check USB/Network connection."
                    )
        
        # Format receipt
        receipt_data = format_receipt(data)
        
        # Send to printer
        if printer.send(receipt_data):
            logger.info(f"Receipt printed successfully: Bill #{data.billNumber}")
            return {
                "success": True,
                "message": "Receipt printed successfully",
                "billNumber": data.billNumber,
                "connectionType": printer.connection_type
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to send data to printer"
            )
            
    except Exception as e:
        logger.error(f"Print failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Print failed: {str(e)}"
        )

@app.get("/api/print/status")
async def printer_status():
    """Check printer connection status"""
    if printer.connection_type:
        return {
            "connected": True,
            "connectionType": printer.connection_type,
            "status": "ready"
        }
    else:
        # Try to connect
        if printer.connect_usb() or printer.connect_network():
            return {
                "connected": True,
                "connectionType": printer.connection_type,
                "status": "ready"
            }
        return {
            "connected": False,
            "connectionType": None,
            "status": "disconnected"
        }

@app.post("/api/print/test")
async def test_print():
    """Print test receipt"""
    try:
        if not printer.connection_type:
            if not printer.connect_usb():
                if not printer.connect_network():
                    raise HTTPException(status_code=503, detail="Printer not connected")
        
        test_data = ReceiptData(
            billNumber="TEST-001",
            customerName="Test Customer",
            customerId="TEST123",
            createdBy="System Test",
            date="15/10/2025",
            time="10:30 AM",
            items=[
                {"name": "Breakfast", "quantity": 1},
                {"name": "Lunch", "quantity": 1}
            ]
        )
        
        receipt_data = format_receipt(test_data)
        
        if printer.send(receipt_data):
            return {"success": True, "message": "Test print successful"}
        else:
            raise HTTPException(status_code=500, detail="Failed to print test receipt")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    printer.disconnect()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
