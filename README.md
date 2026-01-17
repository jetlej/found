# Tracker

A 30-day challenge tracking app built with React Native, Expo, Convex, and Clerk.

## Features

- **Phone Authentication** - Sign in with SMS verification via Clerk
- **Challenge Management** - Create and join 30-day challenges with invite codes
- **Daily Progress Tracking** - Mark each day complete with a tap
- **Real-time Leaderboards** - See rankings update live as participants log progress
- **Offline Support** - Mark progress offline, syncs when back online
- **Push Notifications** - Daily reminders to check in

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Set Up Convex

Create a Convex account at [convex.dev](https://convex.dev) and run:

```bash
bunx convex dev
```

This will:
- Prompt you to log in
- Create a new Convex project
- Generate the `EXPO_PUBLIC_CONVEX_URL` for you
- Start the development server

### 3. Set Up Clerk

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Enable **Phone Number** as a sign-in method
4. Copy your **Publishable Key**

### 4. Environment Variables

Create a `.env` file:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
EXPO_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
```

### 5. Run the App

```bash
# iOS Simulator
bun run ios

# Android Emulator
bun run android

# Expo Go
bun start
```

## Project Structure

```
├── app/                    # Expo Router screens
│   ├── (auth)/            # Sign-in and verification
│   ├── (tabs)/            # Main tab navigation
│   ├── challenge/[id]     # Challenge detail view
│   └── join/[code]        # Join via invite code
├── convex/                # Convex backend
│   ├── schema.ts          # Database schema
│   ├── users.ts           # User mutations/queries
│   ├── challenges.ts      # Challenge CRUD
│   └── progress.ts        # Progress tracking
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities (Clerk, Convex providers)
└── stores/                # Zustand stores (offline)
```

## Tech Stack

- **Frontend**: React Native + Expo SDK 54
- **Navigation**: Expo Router (file-based)
- **Backend**: Convex (real-time database)
- **Auth**: Clerk (phone/SMS)
- **State**: Zustand (offline queue)
- **Notifications**: Expo Notifications

