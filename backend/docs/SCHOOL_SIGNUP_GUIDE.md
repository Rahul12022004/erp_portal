# School Sign-Up System Implementation Guide

## Features Implemented

### 1. **Frontend Sign-Up Page** 
- **Location**: `src/pages/SchoolSignup.tsx`
- **Features**:
  - 3-step registration process
  - Step 1: Collect school and admin details
  - Step 2: Select subscription plan (Basic, Standard, Premium)
  - Step 3: Success confirmation
  - Input validation
  - Error handling
  - Real-time feedback

### 2. **Backend Registration Endpoint**
- **Route**: `POST /api/schools/register`
- **Location**: `backend/src/routes/schoolRoutes.ts`
- **Features**:
  - Validates all required fields
  - Checks for duplicate emails (school and admin)
  - Auto-generates secure random password
  - Creates school record with:
    - School information
    - Auto-generated admin credentials
    - Subscription plan and end date
  - Creates activity log entry
  - Sends credential email

### 3. **Email Service**
- **Function**: `sendSchoolAdminCredentialsEmail()`
- **Location**: `backend/src/utils/sendEmail.ts`
- **Features**:
  - Professional HTML email template
  - Includes admin credentials
  - Subscription plan details
  - Login instructions
  - Support information

### 4. **Super Admin Dashboard Integration**
- **Location**: `src/pages/super_admin/DashboardPage.tsx`
- **Features**:
  - Automatically shows newly registered schools
  - Displays subscriptions stats
  - Shows school counts by subscription type
  - No additional configuration needed

### 5. **Landing Page Update**
- **Location**: `src/pages/LandingPage.tsx`
- **Features**:
  - New "Register Your School" card
  - Link to signup page
  - Professional design matching existing UI

## Configuration Required

### Email Setup (Gmail Example)
1. Enable 2-Factor Authentication in Gmail
2. Generate App Password
3. Update `.env` file in `backend/`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@erp-portal.com
```

### Alternative Email Providers
- **Outlook**: smtp-mail.outlook.com:587
- **SendGrid**: smtp.sendgrid.net:587
- **AWS SES**: email-smtp.region.amazonaws.com:587

## Testing the Sign-Up Flow

### 1. Start Development Servers
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd backend && npm run dev
```

### 2. Navigate to Sign-Up Page
- URL: `http://localhost:8081/school-signup`
- Or click "Register Your School" on landing page

### 3. Test Registration
- Fill in school details
- Fill in admin details
- Select subscription plan
- Submit form

### 4. Verify in Super Admin Dashboard
- Login: `http://localhost:8081/super-admin-login`
- Check Schools page to see new registration
- Check Dashboard for updated stats

### 5. Check Admin Email
- Admin receives email with:
  - Generated password
  - Login URL
  - Subscription details
  - Next steps

## Database Schema

### School Collection
```javascript
{
  schoolInfo: {
    name: String,
    email: String,
    phone: String,
    address: String,
    website: String,
    logo: String
  },
  adminInfo: {
    name: String,
    email: String,
    password: String (auto-generated),
    phone: String,
    status: String (default: "Active")
  },
  systemInfo: {
    schoolType: String,
    maxStudents: Number,
    subscriptionPlan: String,
    subscriptionEndDate: String
  },
  modules: [String],
  timestamps: true
}
```

## API Endpoints

### Registration Endpoint
```
POST /api/schools/register
Content-Type: application/json

Body:
{
  "schoolName": "ABC School",
  "schoolEmail": "school@abc.com",
  "schoolPhone": "+1234567890",
  "schoolAddress": "123 Main St",
  "schoolWebsite": "https://abc.com",
  "adminName": "John Doe",
  "adminEmail": "john@abc.com",
  "adminPhone": "+1234567890",
  "schoolType": "Public",
  "maxStudents": "500",
  "subscriptionPlan": "Standard"
}

Response:
{
  "success": true,
  "message": "School registered successfully! Admin credentials sent to email.",
  "data": {
    "_id": "...",
    "schoolName": "ABC School",
    "adminEmail": "john@abc.com",
    "subscriptionPlan": "Standard"
  }
}
```

## Features Overview

| Feature | Status | Details |
|---------|--------|---------|
| Sign-up Form | ✅ | Complete with validation |
| Plan Selection | ✅ | Basic, Standard, Premium |
| Email Notification | ✅ | Auto-generated credentials sent |
| School Creation | ✅ | Auto-created with credentials |
| Admin Credentials | ✅ | Secure auto-generated password |
| Dashboard Integration | ✅ | Auto-appears in super admin |
| Activity Logging | ✅ | Registration tracked in logs |

## Next Steps (Optional Enhancements)

1. **Payment Integration**
   - Add Stripe/PayPal for plan payments
   - Validate payment before activation

2. **Email Verification**
   - Send verification link
   - Require email confirmation

3. **Admin Password Reset**
   - Implement password change on first login
   - Send password reset links

4. **Onboarding Flow**
   - Setup wizard for new schools
   - Module selection guide
   - Initial data import

5. **Notifications**
   - SMS notifications for admin
   - In-app notifications
   - Admin approval workflow

## Troubleshooting

### Email Not Sending
- Check SMTP credentials in `.env`
- Verify email account allows "Less Secure Apps"
- Check email client spam folder
- Verify network allows SMTP port 587

### School Not Appearing in Dashboard
- Check database connection
- Verify MongoDB Atlas network access
- Refresh browser page
- Check browser console for errors

### Registration Error
- Check all fields are filled
- Verify email addresses are unique
- Check backend logs for detailed error
- Ensure MongoDB is connected
