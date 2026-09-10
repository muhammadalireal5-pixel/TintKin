# Implementation Plan for TintKin Improvements

## Phase 1: Critical UI/UX Fixes (Priority)

### 1.1 Onboarding Alignment & White Spaces
- Fix spacing issues in onboarding page
- Ensure proper padding and margins on mobile/desktop

### 1.2 Capture Page UI After Picture Selection
- Fix alignment issues when picture is selected
- Ensure icons remain visible
- Redesign "Upload new photo" button UX:
  - Move button after the four options
  - Add small note "or last uploaded will be used"
  - Make button allow both taking photos and uploading
  - Fix non-working button issue

### 1.3 Dashboard "Log in for Today" Issue
- Fix StreakPhotoBanner showing incorrect message when already logged
- Check `isAnalyzed` flag properly

### 1.4 Geolocation "Use My Location" Fix
- Fix geolocation not working in LocationPrompt.jsx
- Add proper error handling and permissions

### 1.5 Navbar Alignment
- Fix navbar visibility on phone and laptop
- Ensure proper responsive design

## Phase 2: Performance & Data Flow

### 2.1 Instant Page Loading with Loaders
- Add skeleton loaders to dashboard
- Make pages open instantly without waiting for data
- Implement proper loading states

### 2.2 Auto-refresh Components on Data Update
- When location is updated, auto-refresh dependent components
- Fix components that need refreshing when related data changes
- Implement proper state management for auto-updates

### 2.3 Personalization Fix
- Ensure daily routines only generate AFTER location is obtained
- Fix routine generation before location data loads

### 2.4 Global Users in Country Leaderboards
- Fix users flagged as "global" appearing in country leaderboards
- Update getLeaderboard function to properly filter by optInComparison

## Phase 3: New Features

### 3.1 Reports System
- Create /reports page with weekly and monthly reports
- Auto-generate reports weekly and monthly
- Allow manual report trigger every 3 days
- Generate reports using Qwen AI
- Add download functionality
- Add share functionality (Instagram, TikTok, WhatsApp)
- Include fancy terms praising the skin

### 3.2 Profile Radar Improvements
- Make radar chart prettier with better styling
- Enhanced visual design

### 3.3 Badge Text Update
- Change "Tintkin longevity gamification" to "Your Badge for Your Skin" or similar fancy text

## Phase 4: Additional Improvements

### 4.1 Pricing Plan Text
- Change "come back tomorrow" to "We will await your arrival" for 48-hour option

### 4.2 Dark Mode Contrast
- Evaluate and improve dark mode contrast if needed

### 4.3 General UI Polish
- Find and fix other similar issues

---

## File Changes Required:

1. `/workspace/app/onboarding/page.jsx` - Alignment fixes
2. `/workspace/app/capture/page.jsx` - Upload button UX redesign
3. `/workspace/app/dashboard/StreakPhotoBanner.jsx` - Fix logic
4. `/workspace/app/dashboard/LocationPrompt.jsx` - Fix geolocation
5. `/workspace/app/dashboard/page.jsx` - Add loaders, auto-refresh
6. `/workspace/app/dashboard/RadarChartClient.jsx` - Improve styling
7. `/workspace/app/dashboard/TrophyCase.jsx` - Update badge text
8. `/workspace/app/dashboard/LeaderboardCard.jsx` - Fix global users
9. `/workspace/app/lib/actions.js` - Fix leaderboard filtering, add report generation
10. `/workspace/app/components/HeaderAuth.jsx` - Fix navbar
11. NEW: `/workspace/app/reports/page.jsx` - Reports page
12. NEW: `/workspace/app/api/reports/generate/route.js` - Report generation API
13. `/workspace/app/pricing/PricingClient.jsx` - Update text
14. `/workspace/app/globals.css` - Add dark mode improvements
