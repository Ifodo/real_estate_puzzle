Product Requirements Document (PRD)
Product: IGetHouse – Property Puzzle / Jigsaw

Version: 1.0
Prepared for: IGetHouse Product & Engineering Team
Date: August 2025

1. Product Overview

The IGetHouse Property Puzzle is an interactive jigsaw-style mini-game designed to increase user engagement and drive traffic to IGetHouse’s property listings.

Users piece together a puzzle of a beautiful home image. Upon completion, they are rewarded with an engaging success animation and a call-to-action (CTA):

“Want to see homes like this? Click here.”

This product transforms passive browsing into an active, gamified experience, strengthening IGetHouse’s position as a modern, user-first real estate platform.

2. Objectives & Goals
🎯 Primary Goal

Increase click-through traffic from the puzzle feature to IGetHouse’s property listings.

🎯 Secondary Goals

Boost average session duration by providing engaging gameplay.

Encourage repeat visits via weekly puzzle challenges.

Support organic reach through social sharing of puzzle completions.

Collect lightweight leads (optional) from puzzle participants who opt in to leaderboards or contests.

3. Key Features
🧩 Core Gameplay

Drag-and-drop jigsaw puzzle of a home/property photo.

Puzzle difficulty levels:

Easy (9–12 pieces)

Medium (16–25 pieces)

Hard (36–49 pieces)

Puzzle images sourced from IGetHouse’s curated library of homes.

🎉 Completion Flow

Success animation (confetti + sound effect).

Popup message:
“Congratulations! You completed the IGetHouse Dream Home Puzzle. Want to see homes like this? → [CTA to listings page].”

Social share buttons (Twitter/X, Facebook, WhatsApp).

🏆 Gamification Layer (Phase 2)

Timer: Track how long users take to complete the puzzle.

Leaderboard: Highlight fastest completions of the week/month.

Badges for milestones (e.g., “Puzzle Explorer”, “Speed Master”).

📲 Engagement Hooks

Weekly new puzzles with fresh property images.

“Challenge a friend” option: share puzzle link with personal invite.

Notification/email to registered users:
“This week’s new IGetHouse Puzzle is live – can you beat your best time?”

4. User Flows
Flow A – First-Time User

User lands on IGetHouse Puzzle Page → “Play Dream Home Puzzle”.

Chooses difficulty.

Completes puzzle.

Success popup → CTA to listings page.

Optional: share score or join leaderboard.

Flow B – Returning User

User receives weekly email/social prompt → “New puzzle available”.

Plays puzzle, attempts leaderboard position.

Completes puzzle, re-engages with listings.

5. Technical Requirements
🔹 Frontend (IGetHouse Website)

Framework: React/Next.js with responsive design.

Puzzle rendering: Canvas/HTML5 or jigsaw library (react-jigsaw-puzzle).

Mobile-first experience optimized for touch gestures.

🔹 Backend

Node.js/Python service for puzzle management.

Store user completion times, leaderboard data.

Admin controls to upload new puzzle images weekly.

🔹 Database

PostgreSQL/MongoDB with tables for:

Puzzle metadata (image, date, difficulty).

User entries (completion times, badges, scores).

Leaderboard rankings.

🔹 Integrations

Google Analytics for tracking engagement & funnel clicks.

Social APIs (Facebook, X, WhatsApp sharing).

IGetHouse CMS (for property image sourcing).

6. Success Metrics (KPIs)

Engagement: Avg. puzzle playtime ≥ 2 mins.

Traffic Funnel: ≥ 25% of puzzle completions click through to listings.

Retention: ≥ 15% of players return weekly.

Social Reach: ≥ 100 shares per month via puzzle completions.

Lead Capture (opt-in): ≥ 5% conversion from players to registered users.

7. Risks & Mitigation
Risk	Mitigation
Low engagement if puzzle too hard	Offer multiple difficulty levels
Users get bored with same puzzle	Release new puzzle weekly
Performance issues on mobile	Optimize puzzle engine for touch + lightweight assets
Fake leaderboard entries	Implement validation & anti-bot measures
Users complete puzzle but don’t click CTA	Strengthen CTA design with clear value proposition
8. Future Enhancements

Seasonal Puzzle Themes: Christmas homes, Valentine villas, Independence Day specials.

Multiplayer Mode: Real-time “race” between friends.

Virtual Reality Puzzle: Assemble a 3D room/home in VR.

Loyalty Rewards: Earn IGetHouse Coins for puzzle play → redeem for discounts or perks.

9. Timeline (High-Level Roadmap)

Week 1–2: Finalize UX/UI design, select jigsaw library.

Week 3–4: Core puzzle development (drag & drop, completion flow).

Week 5–6: Integrate CTA popup, analytics, and sharing features.

Week 7: QA testing (mobile + desktop).

Week 8: Launch MVP with one puzzle image.

Post-launch: Weekly puzzle updates + gradual rollout of leaderboard.

10. Stakeholders

Product Owner: IGetHouse Marketing Team

Engineering Team: Frontend + Backend developers

Design Team: UI/UX designers

Growth Team: Marketing & SEO (to drive traffic to puzzle page)

Operations: Content team (manage puzzle images weekly)