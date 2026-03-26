# Login System - Testing Guide

## 🧪 Testing the Authentication Flow

### Test 1: Landing Page
1. Start the app: `npm run dev` or `bun dev`
2. Visit `http://localhost:5173/`
3. **Expected**: See landing page with "Teacher Login" and "School Admin Login" buttons

### Test 2: Teacher Login
1. Click "Continue as Teacher" button
2. **Expected**: Redirected to `/teacher-login`
3. Enter any email: `teacher@school.com`
4. Enter any password: anything works in demo mode
5. Click "Sign In"
6. **Expected**: 
   - Loading state shows "Signing in..."
   - Redirected to `/teacher` dashboard
   - Top navbar shows your email
   - Profile dropdown available

### Test 3: School Admin Login
1. Go back to home or click "School Admin Login" link
2. Click "Continue as Admin" button
3. **Expected**: Redirected to `/school-admin-login`
4. Enter any email: `admin@school.com`
5. Enter any password: anything works in demo mode
6. Click "Sign In"
7. **Expected**:
   - Loading state shows "Signing in..."
   - Redirected to `/school` dashboard
   - Top navbar shows your email
   - Profile dropdown available

### Test 4: Logout Functionality
1. From any authenticated page, click profile dropdown (top-right)
2. **Expected**: Dropdown menu appears with your name/email
3. Click "Logout" (red text)
4. **Expected**:
   - All auth data cleared
   - Redirected to `/teacher-login` (or `/school-admin-login` for admins)
   - localStorage data removed (check DevTools → Application → Local Storage)

### Test 5: Protected Routes
1. Logout from dashboard
2. Try to manually visit `/teacher` in browser
3. **Expected**: Automatically redirected to `/teacher-login`
4. Same test with `/school` should redirect to login

### Test 6: Role-based Routing
1. Login as teacher
2. Check navbar shows teacher name/email
3. Login as admin (logout first, then login with admin credentials)
4. Check navbar shows admin name/email
5. **Expected**: Each role sees their appropriate dashboard

### Test 7: Remember Me (Optional)
1. Login page has "Remember me" checkbox
2. Check/uncheck it
3. **Note**: Currently stores data in localStorage regardless
4. Can be enhanced with persistent tokens

### Test 8: Error Handling
1. On login page, click "Sign In" without entering anything
2. **Expected**: Error message "Please enter both email and password"
3. Verify error message displays in red alert box

### Test 9: Page Navigation
1. From teacher login, click "School Admin Login" link
2. **Expected**: Navigated to `/school-admin-login`
3. From admin login, click "Teacher Login" link
4. **Expected**: Navigated to `/teacher-login`

---

## 🔍 Browser DevTools Testing

### Check LocalStorage
1. Open Browser DevTools (`F12`)
2. Go to `Application` → `Local Storage`
3. After login, should see:
   - `user` - Contains `{id, email, name, role}`
   - `role` - Contains user role
   - `teacherPermissions` - Contains modules array (for teachers)

### Check Network Requests (When Backend Connected)
1. Open DevTools → `Network` tab
2. Try to login
3. Should see POST request to your login endpoint
4. Response should contain user data

### Check Console Errors
1. Open DevTools → `Console` tab
2. Should see no errors during navigation
3. Check for any authentication-related warnings

---

## ✅ Verification Checklist

- [ ] Landing page displays correctly
- [ ] Teacher login form works
- [ ] School admin login form works
- [ ] Can enter credentials and submit
- [ ] Dashboard loads after successful login
- [ ] Profile dropdown shows user info
- [ ] Logout button appears in dropdown
- [ ] Logout redirects to login page
- [ ] Cannot access protected routes without auth
- [ ] LocalStorage updates correctly on login/logout
- [ ] No console errors during login/logout
- [ ] Styling looks professional
- [ ] Mobile responsive design works
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari)

---

## 🐛 Troubleshooting

### Issue: Landing page doesn't show
- **Fix**: Make sure you're not authenticated. Clear localStorage and refresh.

### Issue: Can't login
- **Fix**: Check console for errors. Verify RoleContext is properly provided in App.tsx

### Issue: Logout redirects to wrong page
- **Fix**: Check TopNavbar handleLogout function has correct redirect logic

### Issue: Protected routes not working
- **Fix**: Verify `isAuthenticated` check in App.tsx routes

### Issue: User data lost on refresh
- **Fix**: LocalStorage persistence should work automatically, check browser storage settings

---

## 🔗 Important URLs

- Landing Page: `http://localhost:5173/`
- Teacher Login: `http://localhost:5173/teacher-login`
- School Admin Login: `http://localhost:5173/school-admin-login`
- Teacher Dashboard: `http://localhost:5173/teacher`
- School Admin Dashboard: `http://localhost:5173/school`

---

## 📊 Sample Test Cases

### Scenario A: Complete Login & Logout Flow
1. Start at home page
2. Click "Teacher Login"
3. Enter `john@school.com` / `password123`
4. Verify dashboard loads
5. Click profile → Logout
6. Verify redirected to login

### Scenario B: Invalid Session Recovery
1. Login as teacher
2. DevTools → Delete `user` from localStorage
3. Try to navigate to `/teacher`
4. Should redirect to login automatically

### Scenario C: Role Switching
1. Login as teacher
2. Logout
3. Login as admin
4. Verify admin dashboard shows
5. Logout and re-login as teacher
6. Verify teacher dashboard shows

---

## 📝 Notes

- Demo mode accepts any email/password combination
- Real backend integration will validate credentials
- All data persists in localStorage (clear cookies/storage to reset)
- Localhost development may require CORS configuration for API calls
- Production deployment needs secure token handling (JWT, HTTPOnly cookies, etc.)

