# BiCommunity — Frontend (React + Vite)

Professional version — same features aur design jo pehle diya tha, ab proper React project ke roop mein (fast build, optimized production bundle).

## Setup (pehli baar)

Terminal kholo, is folder mein jaake:

```bash
npm install
```

Ye saare packages download karega (React, React Router, Vite). Isme 1-2 minute lag sakta hai depending on internet speed.

## Development mode mein chalana

```bash
npm run dev
```

Terminal mein ek URL milega (usually `http://localhost:5173`) — usko browser mein kholo. Jab bhi code change karoge, page apne aap refresh ho jayega.

## Production build (deploy ke liye)

```bash
npm run build
```

Isse ek `dist/` folder banega — ye optimized, fast-loading files hain jo tumhe deploy karni hain (Netlify/Vercel pe).

## Deploy kaise karein (free)

**Netlify (sabse aasan):**
1. `npm run build` chalao pehle
2. https://app.netlify.com/drop par jao
3. `dist` folder ko drag-drop kar do
4. Live URL mil jayega

**Vercel:**
1. https://vercel.com/new
2. GitHub se connect karo (best) ya `dist` folder upload karo

## Agar koi error aaye `npm install` ya `npm run dev` mein

Screenshot bhej dena — is code ko maine bina internet access ke likha hai (offline environment mein), isliye agar koi package version mismatch ya import error aaye to turant fix kar dunga.

## Backend URL badalna ho to

`src/lib/api.js` file ki pehli line:
```js
export const API_BASE = "https://bi-community-backend.onrender.com";
```

## Folder structure

```
src/
  main.jsx                  - entry point (wraps App in Router/Theme/Auth providers)
  App.jsx                   - saare routes yahan defined hain
  index.css                 - poora design system (colors, components, animations)
  lib/
    api.js                   - backend se baat karne wala code (fetch + JWT), WS_BASE bhi yahin
    helpers.jsx               - chhote reusable components (Avatar, Skeleton, ErrorBox, VideoEmbed, timeAgo)
    postTypes.js              - post type/icon/label lookups shared across feed pages
    embed.js                  - YouTube/video link → embeddable URL parsing
  context/
    AuthContext.jsx            - login/logout/register state + current user
    ThemeContext.jsx           - light/dark mode toggle
  components/
    Sidebar.jsx                 - left nav (desktop) — communities/circles/messages/settings
    Topbar.jsx                  - top navigation on guest (logged-out) pages
    MobileNav.jsx                - bottom nav on small screens
    RequireAuth.jsx              - login-required pages ko protect karta hai
    SearchBar.jsx                 - top search input + live dropdown results
  pages/
    Landing, Login, Register, Verify         - guest-facing
    Communities                                - home dashboard (stats + browse/join communities)
    CommunityDetail, PostDetail                - a community's feed + a single post/comments
    Circles, CircleDetail                       - private invite-only groups + their chat
    Chat                                         - live room chat, shared by community + circle (kind prop)
    Messages, MessageThread                       - 1:1 direct messages list + a single conversation
    Profile, Settings                              - own/other user profile, account settings
    SavedPosts, SearchResults                       - saved-post bookmarks, global search results
```

Naming convention: every file in `pages/` and `components/` is PascalCase
matching its default export (`Chat.jsx` exports `Chat`); everything in
`lib/` is a plain camelCase module, not a component.

## Backend mein bhi ek chhota sa kaam karna hoga (jab deploy karo)

Jab tumhara frontend live ho jaye (Netlify/Vercel URL mil jaye), uska domain Django backend ke `CORS_ALLOWED_ORIGINS` aur `CSRF_TRUSTED_ORIGINS` mein add karwana padega — warna login/API calls block ho jayenge. Deploy karke URL bhej dena, main backend update kar dunga.
