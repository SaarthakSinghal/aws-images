# People Clustering - AWS Rekognition

A React-based web application for analyzing and clustering faces from photo collections using AWS Rekognition.

## Technologies

This project is built with:

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React 18** - UI library
- **shadcn/ui** - High-quality React components
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Lucide React** - Beautiful icons

## Getting Started

### Prerequisites

- Node.js & npm installed

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

- View clustered faces from your photo collection
- Search and filter people by ID
- Sort by photo count
- Responsive design with dark mode support
- Client-side caching for improved performance
- Photo lightbox for viewing details

## Project Structure

```
src/
├── components/      # Reusable UI components
├── pages/          # Page components
├── lib/            # Utility functions and API calls
├── hooks/          # Custom React hooks
└── types/          # TypeScript type definitions
```

## Configuration

The app requires API configuration to connect to your AWS Rekognition backend. Configure this through the in-app configuration screen on first load.
