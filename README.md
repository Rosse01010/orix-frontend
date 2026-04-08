# orix-frontend

Frontend application for the **Orix** platform, built with React 19, Vite, and Tailwind CSS.

## Tech Stack

- **Framework:** React 19 + Vite 8
- **Styling:** Tailwind CSS 4
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Real-time:** Socket.IO Client
- **Linting:** ESLint 9

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app runs at `http://localhost:5173` by default.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
├── assets/        # Static assets (images, fonts)
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── pages/         # Page-level components
├── services/      # API service layer
├── store/         # Zustand state stores
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## Environment Variables

Create a `.env.local` file at the root (never commit this file):

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming conventions, commit message format, and pull request process.

## License

Private — All rights reserved.
