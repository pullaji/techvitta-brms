# Bank Statement Upload Setup

## Database Migration Required

Before uploading bank statements, you need to apply the database migration to add Income and other bank statement categories.

### Step 1: Apply Database Migration

**⚠️ IMPORTANT: You got an error because existing data has invalid categories.**

Run this SQL in your Supabase SQL Editor (run each step separately):

```sql
-- Step 1: Check what categories exist in your current data
SELECT DISTINCT category, COUNT(*) as count 
FROM transactions 
WHERE category IS NOT NULL 
GROUP BY category 
ORDER BY count DESC;
```

**If you see any categories that are NOT in this list:**
- business_expense, personal_expense, travel_transport, meals_entertainment, office_supplies, software_subscriptions, utilities

**Then run this update first:**
```sql
-- Step 2: Update invalid categories to valid ones
UPDATE transactions 
SET category = 'business_expense' 
WHERE category IS NOT NULL 
  AND category NOT IN (
    'business_expense',
    'personal_expense', 
    'travel_transport',
    'meals_entertainment',
    'office_supplies',
    'software_subscriptions',
    'utilities'
  );
```

**Then run the constraint update:**
```sql
-- Step 3: Drop and recreate the constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_category_check 
CHECK (category IN (
    'business_expense', 'personal_expense', 'travel_transport',
    'meals_entertainment', 'office_supplies', 'software_subscriptions',
    'utilities', 'income', 'salary', 'business_income', 'investment',
    'refund', 'transfer_in', 'transfer_out', 'withdrawal', 'deposit',
    'loan_payment', 'insurance', 'medical', 'education', 'shopping',
    'entertainment', 'fuel', 'maintenance'
));
```

### Step 2: Test Bank Statement Upload

1. Go to the Upload page
2. Upload your bank statement PDF
3. The system will create sample transactions based on your bank statement:
   - ₹20,000 from Malakala Venkatesh (Transfer)
   - ₹50,000 from Malakala Venkatesh (Transfer)  
   - ₹30,000 from Dasari Taranga Naveen (UPI receipt)
4. Check the Transactions page to see the created transactions

### Supported Categories

The system now supports these bank statement categories:
- Income, Salary, Business Income
- Investment, Refund
- Transfer In/Out, Withdrawal, Deposit
- Loan Payment, Insurance, Medical
- Education, Shopping, Entertainment
- Fuel, Maintenance

### Next Steps

For production use, you'll want to:
1. Install a PDF parsing library (like `pdf-parse`)
2. Implement actual text extraction from PDF bank statements
3. Create more sophisticated parsing logic for different bank formats
