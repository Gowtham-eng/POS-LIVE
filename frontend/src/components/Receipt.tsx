import React from 'react';

interface ReceiptProps {
  billNumber: string;
  customerName: string;
  customerId: string;
  createdBy: string;
  date: string;
  time: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  location?: string;
}

export const Receipt: React.FC<ReceiptProps> = ({
  billNumber,
  customerName,
  customerId,
  createdBy,
  date,
  time,
  items,
  location = 'Refex Nungambakkam'
}) => {
  return (
    <div className="receipt-container" id="receipt-print">
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .receipt-container {
            width: 80mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 5mm;
            background: white;
          }
          
          .receipt-header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
          }
          
          .receipt-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .receipt-location {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .receipt-bill-number {
            font-size: 14px;
            font-weight: bold;
            margin: 5px 0;
          }
          
          .receipt-info {
            margin: 10px 0;
            font-size: 11px;
          }
          
          .receipt-info-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          
          .receipt-items {
            margin: 15px 0;
            border-top: 2px dashed #000;
            border-bottom: 2px dashed #000;
            padding: 10px 0;
          }
          
          .receipt-items-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px solid #000;
          }
          
          .receipt-item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          
          .receipt-footer {
            text-align: center;
            margin-top: 15px;
            font-size: 11px;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        @media screen {
          .receipt-container {
            width: 80mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 5mm;
            background: white;
            border: 1px solid #ddd;
            margin: 20px auto;
          }
          
          .receipt-header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
          }
          
          .receipt-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .receipt-location {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .receipt-bill-number {
            font-size: 14px;
            font-weight: bold;
            margin: 5px 0;
          }
          
          .receipt-info {
            margin: 10px 0;
            font-size: 11px;
          }
          
          .receipt-info-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          
          .receipt-items {
            margin: 15px 0;
            border-top: 2px dashed #000;
            border-bottom: 2px dashed #000;
            padding: 10px 0;
          }
          
          .receipt-items-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px solid #000;
          }
          
          .receipt-item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          
          .receipt-footer {
            text-align: center;
            margin-top: 15px;
            font-size: 11px;
          }
        }
      `}</style>
      
      <div className="receipt-header">
        <div className="receipt-title">KITCHEN PRINT</div>
        <div className="receipt-location">{location}</div>
        <div className="receipt-bill-number">***Bill No. - {billNumber}***</div>
      </div>
      
      <div className="receipt-info">
        <div className="receipt-info-row">
          <span>Customer:</span>
          <span>{customerName}</span>
        </div>
        <div className="receipt-info-row">
          <span>Created by:</span>
          <span>{createdBy}</span>
        </div>
        <div className="receipt-info-row">
          <span>DATE: {date}</span>
          <span>TIME: {time}</span>
        </div>
      </div>
      
      <div className="receipt-items">
        <div className="receipt-items-header">
          <span>Item Name</span>
          <span>QTY</span>
        </div>
        {items.map((item, index) => (
          <div key={index} className="receipt-item">
            <span>{item.name.toUpperCase()}</span>
            <span>{item.quantity}</span>
          </div>
        ))}
      </div>
      
      <div className="receipt-footer">
        <div>Thank you!</div>
        <div style={{ marginTop: '5px', fontSize: '10px' }}>Powered by Refex POS System</div>
      </div>
    </div>
  );
};

export default Receipt;
