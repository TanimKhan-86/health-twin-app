# 🩺 Health Twin App

A React Native + Expo health tracking application with a Node.js/Express backend and MongoDB Atlas.

---

## 📁 Project Structure

```
health-twin-app/
├── App.tsx                  # Expo app entry point
├── screens/                 # All app screens
├── components/              # Reusable UI components
├── lib/                     # Services, analytics, gamification logic
├── contexts/                # React context (Auth)
├── .env                     # Frontend env (API URL)
└── server/                  # Express backend
    ├── src/
    │   ├── index.ts         # Entry point
    │   ├── db.ts            # MongoDB connection
    │   ├── middleware/
    │   │   └── auth.ts      # JWT middleware
    │   ├── models/
    │   │   ├── User.ts
    │   │   ├── HealthEntry.ts
    │   │   └── MoodEntry.ts
    │   └── routes/
    │       ├── auth.ts      # Register / Login / Me
    │       ├── health.ts    # Health entries CRUD
    │       ├── mood.ts      # Mood entries CRUD
    │       ├── analytics.ts # Aggregated stats
    │       ├── achievements.ts # Badges
    │       └── seed.ts      # Demo data seeder
    ├── package.json
    ├── tsconfig.json
    ├── .env                 # Backend secrets (MongoDB URI, JWT)
    └── .env.example         # Template for new devs
```

---

## 🚀 Quick Start (Second Developer)

### Prerequisites
- Node.js 18+
- npm
- Expo CLI (`npm install -g expo-cli`)

---

### 1. Clone the repo

```bash
git clone https://github.com/TanimKhan-86/health-twin-app.git
cd health-twin-app
```

---

### 2. Start the Backend

```bash
cd server
npm install
npm run dev
```

The server will start on **http://localhost:4000**

> ✅ `.env` is already included with the MongoDB Atlas credentials.  
> If you need a fresh DB, update `MONGODB_URI` in `server/.env`.

---

### 3. Start the Frontend

In a **new terminal** from the project root:

```bash
npm install
```

Copy the env file:
```bash
cp .env.example .env
```

Edit `.env` based on how you're running:

| Mode | `EXPO_PUBLIC_API_URL` |
|---|---|
| Expo Web / browser | `http://localhost:4000` |
| Expo Go on phone (same Wi-Fi) | `http://YOUR_LOCAL_IP:4000` |
| Android Emulator | `http://10.0.2.2:4000` |
| ngrok tunnel | `https://xxxx.ngrok-free.app` |

Then start the app:
```bash
npx expo start
```

---

## 🔑 API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Login + get JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/health?days=7` | ✅ | Get health entries |
| POST | `/api/health` | ✅ | Add health entry |
| PUT | `/api/health/:id` | ✅ | Update entry |
| DELETE | `/api/health/:id` | ✅ | Delete entry |
| GET | `/api/mood?days=7` | ✅ | Get mood entries |
| POST | `/api/mood` | ✅ | Add mood entry |
| GET | `/api/analytics/summary?days=7` | ✅ | Aggregated stats |
| GET | `/api/achievements` | ✅ | Badges/gamification |
| POST | `/api/seed/demo` | ✅ | Seed 7 days of demo data |
| POST | `/api/avatar/setup` | ✅ | Upload real photo, generate stylized avatar + 4 emotional loops |
| GET | `/api/avatar/status` | ✅ | Avatar readiness + generated state list |
| GET | `/api/avatar/state` | ✅ | Return one dynamic looping animation for dashboard |

All protected routes require: `Authorization: Bearer <token>`

---

## 🧰 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React Native, Expo, NativeWind |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT (30-day tokens) |

---

## 🎭 NanoBana Avatar System

The app includes a dynamic, NanoBana-powered avatar pipeline:

1. User uploads a real photo (`/api/avatar/setup`)
2. Backend generates a stylized base avatar (demo style preset)
3. Base avatar is saved in MongoDB (`Avatar` collection)
4. Saved avatar is reloaded from DB and used to generate 4 loop animations:
   - happy
   - sad
   - sleepy
   - stressed
5. Animations are saved in MongoDB (`AvatarAnimation` collection)
6. Dashboard requests `/api/avatar/state` to play exactly one looping animation in a circular frame
7. State selection updates from daily health/mood metrics

### Optional backend env vars

Add these to `server/.env` for real NanoBana API mode:

```bash
NANO_BANA_API_URL=https://api.nanobana.ai/v1
NANO_BANA_API_KEY=your_nanobana_api_key_here
NANO_BANA_STYLE_PRESET=health_twin_demo_style_v1
```

If not set, the system falls back to deterministic demo assets so the flow still works.
