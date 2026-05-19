# Finance Module - API Quick Reference

## Base URL
```
http://localhost:5000/api/finance
```

---

## 1. CLASS FEE STRUCTURES

### 📝 CREATE Class Fee Structure
```
POST /class-fee-structures

{
  "schoolId": "school_id",
  "class_id": "Class 10",
  "section_id": "A",
  "academic_year": "2024-2025",
  "academic_fee": 50000,
  "default_transport_fee": 5000,
  "other_fee": 1000,
  "due_date": "2024-06-30",
  "created_by": "user_id"
}

✅ Response: 201
{
  "success": true,
  "data": {
    "structure": { ... },
    "assignedCount": 45  // Students auto-assigned
  }
}
```

### 📋 GET All Structures with Stats
```
GET /class-fee-structures?schoolId=school_id

✅ Response: 200
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "class_id": "Class 10",
      "academic_fee": 50000,
      "default_transport_fee": 5000,
      "assignedCount": 45,
      "paidCount": 12,
      "pendingCount": 33
    }
  ]
}
```

### 🔍 GET Specific Structure
```
GET /class-fee-structures/:id

✅ Response: 200
{
  "success": true,
  "data": { /* ClassFeeStructure */ }
}
```

### ✏️ EDIT Class Fee Structure
```
PUT /class-fee-structures/:id

{
  "schoolId": "school_id",
  "academic_fee": 52000,
  "default_transport_fee": 5500,
  "other_fee": 1500,
  "due_date": "2024-07-15"
}

✅ Response: 200
{
  "success": true,
  "data": {
    "structure": { ... },
    "syncedCount": 45  // Assignments resynced
  }
}
```

---

## 2. STUDENT FEE ASSIGNMENTS

### 📊 GET Student Fees (with filters & search)
```
GET /student-fee-assignments?schoolId=...&class_id=...&section_id=...&academic_year=...&search=...

Query Params:
- schoolId (required)
- class_id (optional)
- section_id (optional)
- academic_year (optional)
- search (optional) - name, roll_no, or registration_no

✅ Response: 200
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "student_id": {
        "name": "Raj Kumar",
        "roll_no": "101",
        "registration_no": "REG001"
      },
      "academic_fee": 50000,
      "transport_fee": 5000,
      "other_fee": 1000,
      "total_fee": 56000,
      "paid_amount": 15000,
      "due_amount": 41000,
      "fee_status": "PARTIAL",
      "due_date": "2024-06-30"
    }
  ]
}
```

### 💵 GET Assignment with Payment History
```
GET /student-fee-assignments/:id

✅ Response: 200
{
  "success": true,
  "data": {
    "assignment": { /* StudentFeeAssignment */ },
    "payments": [
      {
        "payment_date": "2024-05-15",
        "payment_amount": 15000,
        "payment_mode": "online",
        "receipt_no": "RCP-..."
      }
    ]
  }
}
```

---

## 3. STUDENT PAYMENTS

### 💸 RECORD Payment
```
POST /student-fee-payments

{
  "schoolId": "school_id",
  "student_fee_assignment_id": "assignment_id",
  "payment_date": "2024-05-15",
  "payment_amount": 15000,
  "payment_mode": "cash",
  "reference_no": "CHK-12345",
  "remarks": "Cheque received",
  "created_by": "user_id"
}

✅ Response: 201
{
  "success": true,
  "data": {
    "payment": {
      "_id": "...",
      "receipt_no": "RCP-abc123xyz",
      "payment_amount": 15000
    },
    "assignment": {
      "paid_amount": 30000,    // Updated
      "due_amount": 26000,     // Updated
      "fee_status": "PARTIAL"  // Updated
    },
    "receipt_no": "RCP-abc123xyz"
  }
}
```

**Validation Errors:**
```
❌ 400: payment_amount must be > 0
❌ 400: Payment cannot exceed due amount
```

### 📜 GET Payment History
```
GET /student-fee-payments/:studentId?schoolId=school_id

✅ Response: 200
{
  "success": true,
  "data": [
    {
      "payment_date": "2024-05-15",
      "payment_amount": 15000,
      "payment_mode": "online",
      "receipt_no": "RCP-...",
      "reference_no": "UTR123",
      "remarks": "Online transfer"
    }
  ]
}
```

---

## 4. TRANSPORT STATUS

### 🚌 UPDATE Transport Status
```
PATCH /students/:studentId/transport-status

{
  "schoolId": "school_id",
  "transport_status": "ACTIVE"
}

Valid Values: "ACTIVE" | "INACTIVE" | "NO_TRANSPORT"

✅ Response: 200
{
  "success": true,
  "data": {
    "student": {
      "name": "Raj Kumar",
      "transport_status": "ACTIVE"
    },
    "updatedAssignments": 3  // Assignments recalculated
  }
}
```

**What This Does:**
- Changes student's transport_status
- Finds all UNPAID/PARTIAL/OVERDUE assignments
- Adds/removes transport_fee based on new status
- Recalculates total_fee and due_amount
- Updates fee_status automatically
- PAID assignments are not touched (historical data)

---

## 5. DASHBOARD

### 📈 GET Class Fee Summary
```
GET /class/:classId/summary?schoolId=school_id&academic_year=2024-2025

✅ Response: 200
{
  "success": true,
  "data": {
    "summary": {
      "totalStudents": 45,
      "paidCount": 12,
      "pendingCount": 33,
      "totalFeeCollectable": 2520000,
      "totalFeeCollected": 630000,
      "totalPending": 1890000,
      "collectionPercentage": "25.00"
    },
    "assignments": [ /* array of assignments */ ]
  }
}
```

---

## Fee Status Values

| Status | Meaning | Condition |
|--------|---------|-----------|
| PAID | Fee fully paid | `due_amount <= 0` |
| PARTIAL | Partial payment made | `paid_amount > 0 AND due_amount > 0` |
| UNPAID | No payment received | `paid_amount == 0` |
| OVERDUE | Past due date with pending | `current_date > due_date AND due_amount > 0` |

---

## Payment Mode Values

- `cash` - Cash payment
- `upi` - UPI transfer
- `card` - Card payment
- `cheque` - Cheque payment
- `bank_transfer` - Bank transfer

---

## Error Response Format

```
❌ Response: 400/404/500
{
  "error": "Error title",
  "message": "Detailed error message"
}
```

---

## Receipt Number Format

```
RCP-{school_id_last6}-{timestamp}-{random}
Example: RCP-abc123-1715864523456-7829
```

---

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET) |
| 201 | Created (POST) |
| 400 | Bad request / validation error |
| 404 | Not found |
| 500 | Server error |

---

## Example Frontend Usage (React)

```javascript
// 1. Save class fee structure
const handleSaveFeeStructure = async (formData) => {
  try {
    const result = await axios.post(
      '/api/finance/class-fee-structures',
      {
        schoolId: "school123",
        class_id: formData.classId,
        section_id: formData.sectionId,
        academic_year: "2024-2025",
        academic_fee: formData.academicFee,
        default_transport_fee: formData.transportFee,
        due_date: formData.dueDate,
        created_by: userId
      }
    );
    toast.success(`✅ ${result.data.data.assignedCount} students assigned!`);
  } catch (error) {
    toast.error(`❌ ${error.response.data.message}`);
  }
};

// 2. Fetch students for table
const handleSelectClass = async (classId) => {
  try {
    const result = await axios.get('/api/finance/student-fee-assignments', {
      params: {
        schoolId: "school123",
        class_id: classId,
        academic_year: "2024-2025"
      }
    });
    setStudentFees(result.data.data);
  } catch (error) {
    toast.error("Failed to load students");
  }
};

// 3. Record payment
const handleRecordPayment = async (assignmentId, paymentData) => {
  try {
    const result = await axios.post('/api/finance/student-fee-payments', {
      schoolId: "school123",
      student_fee_assignment_id: assignmentId,
      payment_date: paymentData.date,
      payment_amount: paymentData.amount,
      payment_mode: paymentData.mode,
      created_by: userId
    });

    // Update row in table
    updateStudent(assignmentId, result.data.data.assignment);

    // Show receipt
    toast.success(`✅ Payment recorded! Receipt: ${result.data.data.receipt_no}`);
  } catch (error) {
    toast.error(error.response.data.message);
  }
};
```

---

## Complete Workflow

```
1. ADMIN SAVES FEE STRUCTURE
   POST /class-fee-structures
   → Auto-assigns to 45 students

2. ADMIN VIEWS STUDENTS
   GET /student-fee-assignments?class_id=Class%2010
   → Shows 45 students with totals, paid, pending

3. ADMIN RECORDS FIRST PAYMENT
   POST /student-fee-payments
   → Student: UNPAID → PARTIAL
   → Fee due reduced

4. ADMIN RECORDS FINAL PAYMENT
   POST /student-fee-payments
   → Student: PARTIAL → PAID
   → All amounts settled

5. ADMIN CHANGES TRANSPORT
   PATCH /students/:id/transport-status
   → All UNPAID assignments recalculated
   → Transport fee added/removed

6. ADMIN VIEWS SUMMARY
   GET /class/:id/summary
   → 25% of 2.5M collected
   → 33 students still pending
```

---

**Pro Tips:**
- Always include `schoolId` in requests
- `search` parameter is partial match on name, roll_no, registration_no
- Payment amounts are validated against current `due_amount`
- Fee status updates automatically - no manual status update needed
- Transport status changes recalculate ALL pending assignments instantly
- Receipt numbers are auto-generated, unique, and never duplicated
