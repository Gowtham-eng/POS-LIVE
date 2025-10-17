// API endpoint for print server
const PRINT_SERVER_URL = 'http://localhost:8002';

// Silent print via local print server (recommended for thermal printers)
export const printReceiptSilent = async (receiptData: any) => {
  try {
    const response = await fetch(`${PRINT_SERVER_URL}/api/print/receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(receiptData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Print failed');
    }
    
    const result = await response.json();
    console.log('Print successful:', result);
    return true;
  } catch (error: any) {
    console.error('Silent print failed:', error);
    // Fallback to browser print if print server is not available
    throw error;
  }
};

// Check if print server is available
export const checkPrintServer = async () => {
  try {
    const response = await fetch(`${PRINT_SERVER_URL}/api/print/status`, {
      method: 'GET',
    });
    const status = await response.json();
    return status.connected;
  } catch (error) {
    console.log('Print server not available');
    return false;
  }
};

// Browser-based print (fallback)
export const printReceipt = (receiptElementId: string = 'receipt-print') => {
  return new Promise<void>((resolve, reject) => {
    try {
      // Get the receipt element
      const receiptElement = document.getElementById(receiptElementId);
      
      if (!receiptElement) {
        reject(new Error('Receipt element not found'));
        return;
      }
      
      // Create a new window for printing
      const printWindow = window.open('', '', 'width=800,height=600');
      
      if (!printWindow) {
        reject(new Error('Could not open print window. Please check popup blocker.'));
        return;
      }
      
      // Write the receipt HTML to the new window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Receipt</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: 'Courier New', monospace;
            }
            
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${receiptElement.outerHTML}
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for content to load
      printWindow.onload = () => {
        // Small delay to ensure rendering is complete
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          
          // Close the window after printing
          setTimeout(() => {
            printWindow.close();
            resolve();
          }, 500);
        }, 250);
      };
      
    } catch (error) {
      reject(error);
    }
  });
};

// Generate receipt data from billing information
export const generateReceiptData = (billing: any, currentUser: string) => {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  const time = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Determine customer name and ID
  let customerName = 'Unknown';
  let customerId = 'N/A';
  
  if (billing.isGuest) {
    customerName = billing.customer.name || 'Guest';
    customerId = 'GUEST';
  } else if (billing.isSupportStaff) {
    customerName = billing.customer.name || 'Unknown';
    customerId = billing.customer.staffId || 'N/A';
  } else {
    customerName = billing.customer.employeeName || 'Unknown';
    customerId = billing.customer.employeeId || 'N/A';
  }
  
  // Format items for receipt
  const items = billing.items.map((item: any) => ({
    name: item.name,
    quantity: item.quantity
  }));
  
  return {
    billNumber: billing.id?.toString() || 'PENDING',
    customerName,
    customerId,
    createdBy: `Refex Admin ${currentUser}`,
    date,
    time,
    items,
    location: 'Refex Nungambakkam'
  };
};

// Auto-print function for thermal printer (tries silent print first, falls back to browser print)
export const autoPrintReceipt = async (receiptData: any, elementId: string = 'receipt-print') => {
  try {
    // Try silent print via print server first
    try {
      await printReceiptSilent(receiptData);
      console.log('✅ Silent print successful');
      return true;
    } catch (silentError) {
      console.log('Silent print not available, falling back to browser print');
      
      // Wait a moment for the receipt component to render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fallback to browser print
      await printReceipt(elementId);
      return true;
    }
  } catch (error) {
    console.error('Auto-print failed:', error);
    return false;
  }
};
