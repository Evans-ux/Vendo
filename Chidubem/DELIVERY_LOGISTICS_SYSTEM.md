# 🚚 Delivery & Logistics System - Professional Implementation

## 🎯 Business Model

### **Supplier Types:**

#### **1. LOCAL Suppliers** (Your main suppliers)
Products can use **EITHER** delivery method:

**Option A: Self-Delivery (Own Waybill)**
- Supplier handles delivery themselves
- Uses their own waybill/logistics
- **No logistics fee** to platform
- 2-3 day delivery promise
- Supplier keeps full profit

**Option B: Platform Logistics**
- Platform arranges delivery
- Supplier pays logistics fee per order
- Fee shown upfront (e.g., ₦1,500)
- 2-3 day delivery promise
- More convenient for supplier

#### **2. DROPSHIP Suppliers** (Third-party)
- You integrate their API
- Add 10% markup to their prices
- They handle everything (inventory, shipping)
- 14-21 day delivery
- Payment goes to them, they ship
- **DROPSHIP_HANDLED** delivery method

---

## 📊 Database Schema

### **Product Model** (Per-Product Delivery):

```prisma
model Product {
  // ... other fields ...
  
  // Delivery Method (chosen per product)
  deliveryMethod DeliveryMethod @default(SELF_DELIVERY)
  
  // Logistics Fee (for PLATFORM_LOGISTICS)
  // Shown to supplier when they select this option
  logisticsFee Decimal? @db.Decimal(10, 2)
}

enum DeliveryMethod {
  SELF_DELIVERY        // Supplier handles (FREE)
  PLATFORM_LOGISTICS   // Platform handles (Fee applies)
  DROPSHIP_HANDLED     // Third-party handles
}
```

### **Why Per-Product?**

✅ **Flexibility** - Different products, different methods
✅ **Cost Control** - Supplier decides based on profit margin
✅ **Product-Specific** - Heavy items → platform, light → self
✅ **Industry Standard** - Jumia, Amazon work this way

---

## 💰 Logistics Fee Structure

### **Platform Logistics Fees** (Examples):

```typescript
const LOGISTICS_FEES = {
  // Based on product weight/size
  SMALL: 800,   // ₦800  - Accessories, small items
  MEDIUM: 1500, // ₦1,500 - Shoes, clothes
  LARGE: 2500,  // ₦2,500 - Bags, bulky items
  CUSTOM: 0,    // Custom fee per product
};
```

### **Fee Calculation:**

When supplier uploads product:
1. Supplier enters product details
2. System suggests logistics fee based on category/weight
3. Supplier sees: "Platform Logistics: ₦1,500 per order"
4. Supplier chooses delivery method
5. Fee saved with product

### **Fee Deduction:**

When order is placed:
- Customer pays full price
- Platform deducts logistics fee
- Remaining amount goes to supplier

**Example:**
```
Product Price: ₦10,000
Logistics Fee: ₦1,500
Supplier Gets: ₦8,500
```

---

## 🎨 Product Upload Flow

### **Step 1: Product Details**
- Name, description, category
- Images, sizes, stock
- Base price (auto-calculate selling price)

### **Step 2: Delivery Method** (NEW)

**For LOCAL Suppliers:**

```
┌─────────────────────────────────────────┐
│ How will this product be delivered?     │
├─────────────────────────────────────────┤
│                                         │
│ ○ Self-Delivery (Own Waybill)          │
│   I'll handle delivery myself           │
│   No logistics fee                      │
│   ✓ Keep full profit                    │
│                                         │
│ ○ Platform Logistics                    │
│   Vendo handles delivery for me         │
│   Logistics fee: ₦1,500 per order      │
│   ✓ More convenient                     │
│                                         │
└─────────────────────────────────────────┘
```

**For DROPSHIP Suppliers:**
- Automatically set to `DROPSHIP_HANDLED`
- No choice needed (API handles everything)

### **Step 3: Review & Submit**
- Show all details including delivery method
- Confirm logistics fee if applicable
- Submit for admin approval

---

## 📝 Terms & Conditions

### **Logistics Terms** (Added to T&C):

```markdown
## Delivery & Logistics

### For LOCAL Suppliers:

**Self-Delivery:**
- You are responsible for all delivery arrangements
- You must provide tracking/waybill to customers
- You handle all delivery issues
- No logistics fee charged by platform

**Platform Logistics:**
- Vendo arranges delivery on your behalf
- Logistics fee: ₦[AMOUNT] per order (shown per product)
- Fee is deducted from your payout
- Platform handles delivery issues
- You must package products properly

### For DROPSHIP Suppliers:
- Third-party handles all delivery
- Platform adds 10% markup to your prices
- You receive payment after delivery confirmation
- You handle all delivery arrangements
```

---

## 🔄 Order Flow

### **Self-Delivery Orders:**

1. Customer places order
2. Supplier receives notification
3. Supplier packages product
4. Supplier arranges own delivery
5. Supplier provides waybill to customer
6. Supplier marks as shipped
7. Customer confirms delivery
8. Supplier gets full payment

### **Platform Logistics Orders:**

1. Customer places order
2. Supplier receives notification
3. Supplier packages product
4. **Platform arranges pickup**
5. **Platform provides waybill**
6. Platform handles delivery
7. Customer confirms delivery
8. Supplier gets payment **minus logistics fee**

### **Dropship Orders:**

1. Customer places order
2. **API call to dropship supplier**
3. Dropship supplier ships
4. Platform tracks via API
5. Customer receives product
6. Payment sent to dropship supplier
7. Platform keeps 10% markup

---

## 💡 Implementation Details

### **Product Upload Form:**

```tsx
// For LOCAL suppliers
<div className="space-y-4">
  <h3>Delivery Method</h3>
  
  <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer">
    <input type="radio" name="deliveryMethod" value="SELF_DELIVERY" />
    <div>
      <p className="font-semibold">Self-Delivery (Own Waybill)</p>
      <p className="text-sm text-muted">
        You handle delivery • No logistics fee • Keep full profit
      </p>
    </div>
  </label>
  
  <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer">
    <input type="radio" name="deliveryMethod" value="PLATFORM_LOGISTICS" />
    <div>
      <p className="font-semibold">Platform Logistics</p>
      <p className="text-sm text-muted">
        We handle delivery • Fee: ₦{logisticsFee} per order • More convenient
      </p>
    </div>
  </label>
</div>
```

### **Logistics Fee Calculation:**

```typescript
function calculateLogisticsFee(category: string, weight?: number): number {
  const fees = {
    'Accessories': 800,
    'Footwear': 1500,
    'Clothing': 1200,
    'Bags': 2000,
    'Electronics': 2500,
  };
  
  return fees[category] || 1500; // Default ₦1,500
}
```

### **Order Processing:**

```typescript
async function processOrder(order: Order) {
  for (const item of order.items) {
    const product = await getProduct(item.productId);
    
    if (product.deliveryMethod === 'PLATFORM_LOGISTICS') {
      // Deduct logistics fee from supplier payout
      const supplierPayout = item.unitPrice - product.logisticsFee;
      
      // Arrange platform delivery
      await arrangePlatformDelivery({
        orderId: order.id,
        productId: product.id,
        supplierId: product.supplierId,
      });
    } else if (product.deliveryMethod === 'SELF_DELIVERY') {
      // Notify supplier to arrange delivery
      await notifySupplier({
        orderId: order.id,
        message: 'Please arrange delivery and provide waybill',
      });
    } else if (product.deliveryMethod === 'DROPSHIP_HANDLED') {
      // Call dropship API
      await callDropshipAPI({
        orderId: order.id,
        product: product,
      });
    }
  }
}
```

---

## 📱 Supplier Dashboard

### **Product Card Shows:**

```
┌─────────────────────────┐
│ [Product Image]         │
├─────────────────────────┤
│ Product Name            │
│ ₦10,000                 │
│                         │
│ 🚚 Self-Delivery        │
│ or                      │
│ 🚚 Platform (₦1,500)    │
└─────────────────────────┘
```

### **Order Card Shows:**

```
┌─────────────────────────┐
│ Order #12345            │
├─────────────────────────┤
│ Product: Sneakers       │
│ Price: ₦10,000          │
│ Delivery: Platform      │
│ Logistics Fee: -₦1,500  │
│ Your Payout: ₦8,500     │
└─────────────────────────┘
```

---

## ✅ Implementation Checklist

### **Database:**
- [x] Add `DeliveryMethod` enum
- [x] Add `deliveryMethod` to Product
- [x] Add `logisticsFee` to Product

### **Product Upload:**
- [ ] Add delivery method selection
- [ ] Show logistics fee for platform option
- [ ] Validate selection
- [ ] Save to database

### **Terms & Conditions:**
- [ ] Add logistics terms
- [ ] Explain both delivery methods
- [ ] Show fee structure
- [ ] Require acceptance

### **Order Processing:**
- [ ] Detect delivery method
- [ ] Calculate supplier payout
- [ ] Arrange platform delivery if needed
- [ ] Notify supplier appropriately

### **Supplier Dashboard:**
- [ ] Show delivery method on products
- [ ] Show logistics fee if applicable
- [ ] Show payout breakdown on orders
- [ ] Allow editing delivery method

---

## 🎯 Benefits

### **For Suppliers:**
✅ **Flexibility** - Choose per product
✅ **Cost Control** - Decide based on margins
✅ **Convenience** - Option for platform logistics
✅ **Transparency** - Fees shown upfront

### **For Platform:**
✅ **Revenue** - Logistics fees
✅ **Control** - Can ensure delivery quality
✅ **Scalability** - Easy to add logistics partners
✅ **Professional** - Industry-standard approach

### **For Customers:**
✅ **Reliability** - Platform-backed delivery option
✅ **Tracking** - Better tracking with platform logistics
✅ **Support** - Platform handles delivery issues
✅ **Consistency** - Same delivery experience

---

## 🚀 Next Steps

1. **Update Product Upload Form**
   - Add delivery method selection
   - Show logistics fees
   - Validate choices

2. **Update Terms & Conditions**
   - Add logistics section
   - Explain both methods
   - Show fee structure

3. **Update Order Processing**
   - Detect delivery method
   - Calculate payouts
   - Arrange deliveries

4. **Update Dashboards**
   - Show delivery method
   - Show fees
   - Show payout breakdown

---

## 📊 Summary

**Delivery Method:** ✅ Per-Product (Professional)
**Options:** Self-Delivery, Platform Logistics, Dropship
**Fees:** Shown upfront, deducted from payout
**Flexibility:** Supplier chooses per product
**Industry Standard:** ✅ Matches Jumia, Amazon

**Status:** Schema updated, ready for implementation!
