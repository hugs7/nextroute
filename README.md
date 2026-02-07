# Nextroute

Type-safe Next.js App Router route builder with automatic generation from your file system.

## Features

- 🔒 **Fully Type-Safe**: Get autocomplete and type checking for all your routes
- 🔄 **Auto-Generated**: Scans your Next.js app directory and generates routes automatically
- 👀 **Live Updates**: Watch mode regenerates routes when files change
- ⚙️ **Configurable**: Support for config files and CLI options
- 📦 **Zero Runtime Cost**: All types are compile-time only

## Installation

```bash
npm install nextroute
```

## Quick Start

### 1. Generate Routes

```bash
npx nextroute generate --input ./src/app/api --output ./src/generated/routes.ts
```

### 2. Use in Your Code

```typescript
import { routes } from "./generated/routes";

// Type-safe route building
const userRoute = routes.api.users.$userId("123"); // "/api/users/123"
const listRoute = routes.api.users.$(); // "/api/users"
```

## Configuration

Create a `routes.config.ts` file in your project root:

```typescript
import type { RouteConfig } from "nextroute";

const routeConfig: RouteConfig = {
  input: "./src/app/api",
  output: "./src/generated/routes.ts",
  watch: false,
  basePrefix: "/api",
};

export default routeConfig
```

### Configuration Options

- **`input`** (string): The directory path to scan for route files. This should point to your Next.js API routes directory (e.g., `./src/app/api` or `./app`).

- **`output`** (string): The file path where the generated TypeScript routes file will be written. This file will contain all your type-safe route builders.

- **`watch`** (boolean): When set to `true`, the generator will run in watch mode and automatically regenerate routes whenever files change in the input directory. Defaults to `false`.

- **`basePrefix`** (string): A prefix that will be prepended to all generated routes. For example, if your API routes are under `/api`, set this to `"/api"` so generated routes include this prefix.

## CLI Commands

### Generate Routes

```bash
npx nextroute generate [options]
```

Options:

- `-i, --input <path>`: Input directory to scan (default: "./app/api")
- `-o, --output <path>`: Output file path (default: "./generated/routes.ts")
- `-w, --watch`: Watch for changes and regenerate
- `-c, --config <path>`: Path to config file

### Watch Mode

```bash
npx nextroute generate --watch
```

This will watch your app directory and automatically regenerate routes when files change.

### Integration with Development Workflow

You can integrate the route generator into your development workflow to automatically regenerate routes alongside your dev server. For example, if you are using [Nx](https://github.com/nrwl/nx), you can run both the Next.js dev server and the route generator in parallel:

```json
// project.json
{
  "name": "your-next-app",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/your-next-app",
  "projectType": "application",
  "targets": {
    "dev": {
      "executor": "nx:run-commands",
      "options": {
        "commands": ["next dev", "npx nextroute generate --watch"],
        "parallel": true
      }
    },
    "build": {
      "executor": "@nx/next:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/your-next-app"
      }
    }
  }
}
```

With `"parallel": true`, both commands run simultaneously:

- `next dev` starts your Next.js development server
- `npx nextroute generate --watch` watches for route file changes and regenerates types

This ensures your route types stay in sync with your file system as you develop.

## How It Works

The generator scans your Next.js app directory structure:

```
app/api/
├── users/
│   ├── route.ts              → routes.api.users.$()
│   └── [userId]/
│       └── route.ts          → routes.api.users.$userId(id)
└── posts/
    ├── route.ts              → routes.api.posts.$()
    └── [postId]/
        ├── route.ts          → routes.api.posts.$postId(id)
        └── comments/
            └── route.ts      → routes.api.posts.$postId(id).comments()
```

It uses the directory structure to generate in realtime a typed schema of the available routes in your Next.Js application. You are still responsible for ensuring you use the route in the correct way (i.e. correct HTTP method and query params), however, the route and path params are typed for you.

## Examples

### Basic Usage

```typescript
import { routes } from "./generated/routes";

// Static routes
routes.api.auth.login(); // "/api/auth/login"

// Dynamic routes
routes.api.users.$userId("123"); // "/api/users/123"

// Nested dynamic routes
routes.api.posts.$postId("456").comments(); // "/api/posts/456/comments"

// Access parent route
routes.api.users.$userId("123").$(); // "/api/users/123"
```

### With Next.js

```typescript
import { routes } from './generated/routes';

// In API routes
export async function GET(request: Request) {
  const userRoute = routes.api.users.$userId('123');
  return fetch(userRoute);
}

// In Server Components
async function UserProfile({ userId }: { userId: string }) {
  const res = await fetch(routes.api.users.$userId(userId));
  const user = await res.json();
  return <div>{user.name}</div>;
}
```

## License

MIT
