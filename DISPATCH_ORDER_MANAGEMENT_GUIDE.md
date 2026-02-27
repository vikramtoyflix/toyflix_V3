# Dispatch Order Management System Guide

## Overview

The Dispatch Order Management System provides comprehensive tools for managing order fulfillment, tracking, and returns with UUID-based individual toy tracking.

## Key Features

### 🚀 **Core Functionality**
- **Order Dispatch Creation**: Convert pending orders into dispatch orders
- **UUID Generation**: Unique 10-digit alphanumeric codes for each toy
- **Barcode Printing**: Printable barcodes for warehouse operations
- **Status Tracking**: Real-time order status management
- **Comprehensive Search**: Multi-field search and filtering
- **Edit & Cancel**: Full order management capabilities

### 📊 **Dashboard Views**
1. **Pending Dispatch**: Orders ready to ship
2. **Overdue Returns**: Late returns needing follow-up
3. **UUID Tracking**: Search by UUIDs or order details
4. **All Orders**: Comprehensive dispatch order management

## How to Use

### 1. Creating Dispatch Orders

1. **Navigate to Admin → Dispatch**
2. **Click "Create Dispatch Order"**
3. **Select orders** from the pending orders list
4. **Click "Create Dispatch Orders"**
5. Orders are now ready for dispatch processing

### 2. Processing Dispatch Orders

1. **Go to "Pending Dispatch" tab**
2. **Click "Dispatch Order"** on any pending order
3. **Generate UUIDs** for all toys in the order
4. **Print barcodes** for warehouse team
5. **Add tracking number** and dispatch notes
6. **Confirm dispatch** to mark as shipped

### 3. Managing Dispatch Orders

#### **View Order Details**
- Click the **👁️ View** button to see comprehensive order information
- Includes customer details, dispatch info, and toy UUIDs

#### **Edit Order Information**
- Click the **✏️ Edit** button to update:
  - Tracking number
  - Expected return date
  - Order status
  - Dispatch notes

#### **Cancel Orders**
- Click the **❌ Cancel** button to cancel dispatch orders
- Cancelled orders cannot be edited further

### 4. Tracking and Search

#### **UUID Tracking**
- Each toy gets a unique 10-digit alphanumeric UUID
- Search by UUID to find specific toys
- Track individual toy journey through system

#### **Advanced Search**
Search by any of these criteria:
- Customer name or phone
- Order ID or tracking number
- Toy names
- Order status

#### **Status Filters**
- **Pending**: Ready for dispatch
- **Dispatched**: Shipped to customer
- **Delivered**: Confirmed delivery
- **Returned**: Returned by customer
- **Overdue**: Past expected return date
- **Cancelled**: Cancelled orders

## Status Workflow

```
Pending → Dispatched → Delivered → Returned
    ↓         ↓          ↓
Cancelled  Overdue   Overdue
```

### Status Meanings

| Status | Description | Actions Available |
|--------|-------------|------------------|
| **Pending** | Ready to ship | Dispatch, Edit, Cancel |
| **Dispatched** | Shipped to customer | Edit, Track |
| **Delivered** | Confirmed delivery | Edit, Process Return |
| **Returned** | Returned by customer | View only |
| **Overdue** | Past return date | Follow-up, Process Return |
| **Cancelled** | Cancelled order | View only |

## UUID System

### **UUID Generation**
- **Format**: 10-digit alphanumeric (e.g., `ABC1234567`)
- **Uniqueness**: Each toy gets individual UUID
- **Tracking**: Complete toy journey visibility

### **Barcode Features**
- **Printable**: Professional barcode format
- **Scannable**: Compatible with standard scanners
- **Copy/Paste**: Easy UUID copying for digital tracking

## Best Practices

### **Order Processing**
1. ✅ Always generate UUIDs before dispatch
2. ✅ Print barcodes for warehouse team
3. ✅ Add tracking numbers when available
4. ✅ Update status as orders progress

### **Quality Control**
1. ✅ Verify toy condition before dispatch
2. ✅ Document any damage in notes
3. ✅ Track return conditions
4. ✅ Monitor overdue returns

### **Customer Service**
1. ✅ Use comprehensive order view for customer inquiries
2. ✅ Track individual toys by UUID
3. ✅ Monitor delivery and return dates
4. ✅ Follow up on overdue returns

## Integration Points

### **Database Tables**
- `dispatch_orders`: Main dispatch order records
- `dispatch_items`: Individual toy tracking with UUIDs
- `return_tracking`: Return processing and quality checks

### **API Endpoints**
- `GET /dispatch-orders`: Fetch all dispatch orders
- `POST /dispatch-orders`: Create new dispatch order
- `PUT /dispatch-orders/:id`: Update dispatch order
- `DELETE /dispatch-orders/:id`: Cancel dispatch order

## Troubleshooting

### **Common Issues**

#### **No Toys in Dispatch Order**
- **Cause**: Order items not properly synced
- **Solution**: Check order_items table has proper toy_id references

#### **UUID Generation Fails**
- **Cause**: Empty toys array
- **Solution**: Verify toys are properly extracted from order items

#### **Barcode Printing Issues**
- **Cause**: Browser popup blocker
- **Solution**: Allow popups for the application domain

## Future Enhancements

### **Planned Features**
- 📱 Mobile app for warehouse scanning
- 📧 Automated customer notifications
- 📈 Advanced analytics and reporting
- 🔔 Smart overdue alerts
- 📦 Integration with courier APIs

### **API Improvements**
- Real-time status updates
- Webhook notifications
- Bulk operations
- Advanced filtering options

---

## Support

For technical support or feature requests, contact the development team or refer to the system documentation.

**System Version**: 1.0.0  
**Last Updated**: January 2024 