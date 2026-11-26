// Every project hung in the gallery.
// To take a "Coming soon" project live: paste its URL into `url`, then run `npm run capture`.
// `github` is "owner/repo"; repos not owned by StevenWidinata are shown as team repos.
export const projects = [
  {
    slug: 'about_me',
    title: 'About Me',
    kicker: 'Personal site',
    year: 2026,
    description:
      'My personal website. A 3D star intro spells my name, then a scroll-driven journey from school to BINUS University, with project doors you can walk through.',
    tech: ['HTML', 'CSS', 'JavaScript', 'three.js'],
    url: 'https://steven-widinata.vercel.app',
    github: 'StevenWidinata/About-me',
  },
  {
    slug: 'gaming_devv',
    title: 'Game Finder',
    kicker: 'Daily games directory',
    year: 2026,
    description:
      'A phone-friendly directory of 60+ daily web games like Wordle and Globle. Search by what a game is about, rate games into tier lists, and roll a random game you have not played today.',
    tech: ['HTML', 'CSS', 'JavaScript', 'PWA'],
    url: 'https://game-finder-beryl.vercel.app',
    github: 'StevenWidinata/game-finder',
  },
  {
    slug: 'glitch_type',
    title: 'Glitch Type',
    kicker: 'Typing arcade',
    year: 2026,
    description:
      'A neon, glitch-themed typing trainer with arcade modes. Shoot down word asteroids from a black hole, repair corrupted transmissions, and pick modes with a claw machine.',
    tech: ['TypeScript', 'Vite', 'Canvas 2D', 'Web Audio', 'matter-js'],
    url: 'https://glitch-type.vercel.app',
    github: 'StevenWidinata/glitch_type',
  },
  {
    slug: 'lazy_devv',
    title: 'Lazy Dev',
    kicker: 'One prompt. Every AI.',
    year: 2026,
    description:
      'Write one prompt and launch it into every AI tool at once. Includes prompt templates, enhancers, favorites, history and keyboard shortcuts.',
    tech: ['React', 'Vite', 'Tailwind CSS'],
    url: 'https://lazy-devv.vercel.app',
    github: 'StevenWidinata/lazy_devv',
  },
  {
    slug: 'mewing_academy',
    title: 'Mewing Academy',
    kicker: 'Learning for kids',
    year: 2026,
    description:
      'An accessible learning playground for kids under 10. Kids answer quizzes by raising fingers in front of the camera (on-device AI), play memory games, and chat with Mewy the tutor.',
    tech: ['React', 'Express', 'MediaPipe', 'three.js'],
    url: 'https://mewing-academy-beta.vercel.app',
    github: 'StevenWidinata/Mewing-Academy',
  },
  {
    slug: 'recallzy',
    title: 'Recallzy',
    kicker: 'AI study quizzes',
    year: 2026,
    description:
      'Upload PDFs, photos of notes, slides or text, and AI turns them into a quiz that explains every answer, right or wrong. Tracks weak topics and lets you retry mistakes.',
    tech: ['Next.js', 'TypeScript', 'Supabase', 'Gemini'],
    url: 'https://recallzy.vercel.app',
    github: 'StevenWidinata/recallzy',
  },
  {
    slug: 'sketchy',
    title: 'Sketchy',
    kicker: 'Multiplayer drawing game',
    year: 2026,
    description:
      'A realtime drawing and guessing game for 2 to 20 friends. One player draws a word, everyone else races to guess it in chat. Share a 5-letter code and play in any browser, no sign-up. Every drawing replays as a timelapse at the end.',
    tech: ['React', 'TypeScript', 'Supabase Realtime', 'Vercel Functions', 'Canvas 2D'],
    url: 'https://sketchy-swart.vercel.app',
    github: 'StevenWidinata/sketchy',
  },
  {
    slug: 'zero_signal',
    title: 'Zero Signal',
    kicker: 'Retro arcade hub',
    year: 2026,
    description:
      'A hub of arcade browser games (Connect Four, 2048, chess and more) with a retro arcade UI and cheat-proof leaderboards: the server replays every move.',
    tech: ['React', 'TypeScript', 'Rust', 'Axum', 'PostgreSQL'],
    url: 'https://zerosignal-three.vercel.app',
    github: 'StevenWidinata/ZeroSignal',
  },
  {
    slug: 'usaha_baru',
    title: 'Usaha Baru',
    kicker: 'Small business bookkeeping',
    year: 2026,
    description:
      'A bookkeeping app for small businesses: stock, purchases, sales with cash/QRIS/transfer, supplier debts, and profit, cash-flow and balance-sheet reports.',
    tech: ['Python', 'Flask', 'SQLite', 'PWA'],
    url: null,
    github: 'StevenWidinata/usaha-baru',
  },
  {
    slug: 'acel_academy',
    title: 'Acel Academy',
    kicker: 'Online courses',
    year: 2026,
    description:
      'A course platform with an AI tutor, Acel, that guides you with hints and questions instead of handing out answers. Highlight any confusing line to ask about it, render maths with LaTeX, and take "Challenge Me" quizzes. Built with a team.',
    tech: ['React', 'NestJS', 'Prisma', 'MySQL', 'Gemini'],
    url: 'https://acel-academy.vercel.app',
    github: 'moe-mj/ureeka-general-member-project',
  },
  {
    slug: 'streak_saver',
    title: 'Reelo',
    kicker: 'Android app',
    year: 2026,
    description:
      'An Android app that counts the reels you watch on TikTok, Shorts and Instagram, with a pixel mascot that gets tired the more you scroll. Set limits, curfews and focus sessions. Its download site always links the latest APK with a checksum. Built with a teammate.',
    tech: ['Kotlin', 'Android', 'Jetpack Compose'],
    url: 'https://stevenwidinata.github.io/reelo-site/',
    github: 'OneillAlim/reelo',
  },
  {
    slug: 'trustped',
    title: 'TrustPed',
    kicker: 'Fraud risk AI',
    year: 2026,
    description:
      'A machine-learning app that analyses an online store and estimates its fraud risk from price, review and store anomalies, with SHAP explanations and a Gemini summary.',
    tech: ['React', 'FastAPI', 'XGBoost', 'SHAP', 'Gemini'],
    url: 'https://trustped.vercel.app',
    github: 'moe-mj/acikiwir',
  },
]
