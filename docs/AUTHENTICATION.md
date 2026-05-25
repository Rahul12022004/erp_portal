## Authentication & Login System Documentation

### Overview
A complete authentication system has been implemented for the ERP Portal with:
- **Landing Page** - Welcome screen for unauthenticated users
- **Teacher Login Page** - For teachers to access the teaching dashboard
- **School Admin Login Page** - For school administrators to manage school operations
- **Logout Functionality** - Accessible from the navbar dropdown menu
- **Protected Routes** - Dashboard routes require authentication

---

## 🎯 Quick Start

### 1. Access the Application
- Navigate to the home page (`/`)
- You'll see the landing page with options to login as Teacher or School Admin

### 2. Login
- **Teacher Login**: Click "Continue as Teacher" button
  - Demo endpoint: `/teacher-login`
  - Currently accepts any email and password
  
- **School Admin Login**: Click "Continue as Admin" button
  - Demo endpoint: `/school-admin-login`
  - Currently accepts any email and password

### 3. Logout
- Click the profile dropdown in the top-right navbar
- Select "Logout"
- You'll be redirected to the appropriate login page

---

## 📁 Files Created/Modified

### New Files Created:
1. **`src/pages/TeacherLogin.tsx`**
   - Professional login page for teachers
   - Features: Email/password input, "Remember me" checkbox, error handling
   - Styling: Modern dark theme with gradient background and glassmorphism

2. **`src/pages/SchoolAdminLogin.tsx`**
   - Admin login page with similar design
   - Branded for school administrators
   - Cross-links to teacher login page

3. **`src/pages/LandingPage.tsx`**
   - Welcome page showing role options
   - Feature highlights for each role
   - Navigation to respective login pages

### Modified Files:
1. **`src/contexts/RoleContext.tsx`**
   - Added authentication state (`isAuthenticated`, `user`)
   - Added `User` interface with `id`, `email`, `name`, `role`
   - Added `login()` function to handle user authentication
   - Added `logout()` function to clear auth state and localStorage
   - Persists user data in localStorage

2. **`src/App.tsx`**
   - Imported new login pages and landing page
   - Added public login routes
   - Protected dashboard routes with authentication check
   - Root path (`/`) shows landing page for unauthenticated, dashboard for authenticated users
   - Added redirect logic based on user role

3. **`src/components/TopNavbar.tsx`**
   - Added dropdown menu component import
   - Converted static profile display to interactive dropdown
   - Added logout button with redirect logic
   - Shows "Logout" option in red for clarity

---

## 🔐 Authentication Flow

```
User visits /
    ↓
Not Authenticated? → Show Landing Page
    ↓
Click "Teacher" or "Admin" → Navigate to Login Page
    ↓
Enter Credentials → Login Page Validates
    ↓
Success → RoleContext.login() called
    ↓
User data saved to localStorage
    ↓
Redirect to Dashboard (/teacher or /school)
    ↓
Protected routes now accessible
    ↓
Click Logout → RoleContext.logout() called
    ↓
Clear localStorage & redirect to login page
```

---

## 🛠️ Configuration

### Demo Mode (Current)
The login pages currently work in **demo mode**. They accept any email and password.

### Connect to Backend API

To integrate with your backend, update the `handleSubmit` function in:
- `src/pages/TeacherLogin.tsx`
- `src/pages/SchoolAdminLogin.tsx`

**Example API Integration:**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const response = await fetch("http://localhost:5000/api/auth/teacher/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      throw new Error("Invalid credentials");
    }
    
    const data = await response.json();
    
    // data should contain: { id, email, name, role }
    login({
      id: data.id,
      email: data.email,
      name: data.name,
      role: "teacher", // or data.role
    });

    navigate("/teacher");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Login failed");
  } finally {
    setLoading(false);
  }
};
```

---

## 📱 UI Components Used

- **Button** - From shadcn/ui
- **Input** - Text fields for email/password
- **Card** - Container for login forms
- **Checkbox** - Remember me option
- **Alert** - Error messages display
- **DropdownMenu** - Profile menu with logout

All components are imported from `@/components/ui/`

---

## 🎨 Design Features

### Login Pages
- **Dark Theme**: Slate gray gradient background
- **Glassmorphism**: Semi-transparent white cards with backdrop blur
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Mobile-friendly design
- **Accessibility**: Proper labels and semantic HTML

### Landing Page
- **Feature Cards**: Showcase key features for each role
- **Gradient Background**: Professional visual appeal
- **Call-to-Action**: Clear buttons for login
- **Information Architecture**: Easy navigation

---

## 📋 Key Functions

### In RoleContext

```typescript
// Login user
login(user: User) → Saves user to state and localStorage

// Logout user  
logout() → Clears all auth state and storage

// Check authentication
isAuthenticated: boolean → true if user is logged in

// Get current user
user: User | null → Current logged-in user data
```

### In TopNavbar

```typescript
// Handle logout
handleLogout() → Calls logout() and redirects to appropriate login page
```

---

## 🔄 Data Flow

### LocalStorage Keys
- `user` - Stores user object `{ id, email, name, role }`
- `role` - Stores user role for quick access
- `teacherPermissions` - Teacher-specific permissions

### Context Values Available
```typescript
const { 
  role,                      // Current user role
  setRole,                   // Change role (for role switching)
  teacherPermissions,        // Teacher module permissions
  setTeacherPermissions,     // Update permissions
  isAuthenticated,           // Whether user is logged in
  user,                      // Current user object
  login,                     // Login function
  logout                     // Logout function
} = useRole();
```

---

## 🚀 Next Steps

### 1. Backend Integration
- Connect login endpoints to your Node.js/Express backend
- Implement password validation
- Add JWT token support (if needed)
- Add forgot password functionality

### 2. Enhanced Security
- Add email verification
- Implement 2FA (two-factor authentication)
- Add password strength requirements
- Implement session timeout

### 3. Additional Features
- Multi-school selection for admins
- Remember me functionality (token persistence)
- Forgot password flow
- User registration form

### 4. Testing
Run the application and test:
```bash
npm run dev
# or
bun dev
```

Test the flow:
1. Visit http://localhost:5173/
2. Click login buttons
3. Enter any credentials (demo mode)
4. Verify dashboard loads
5. Click profile dropdown → Logout
6. Verify redirect to login page

---

## ⚙️ Environment Variables (Future)

When connecting to backend, add to `.env`:
```
VITE_API_URL=http://localhost:5000
VITE_API_TIMEOUT=10000
```

Then use in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## 📞 Support

For issues or questions about the authentication system:
1. Check component documentation
2. Review the RoleContext implementation
3. Verify localStorage setup
4. Check browser console for errors

---

## 📝 Summary

✅ **Implemented:**
- Teacher login page with modern design
- School admin login page
- Landing/welcome page
- Logout functionality in navbar
- Protected routes
- Authentication state management
- LocalStorage persistence
- Error handling and loading states

🔄 **Ready for:**
- Backend API integration
- JWT/Token authentication
- Enhanced security features
- Additional user roles (Super Admin)
