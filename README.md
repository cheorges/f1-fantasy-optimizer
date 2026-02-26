# F1 Fantasy Team Optimizer

Web app that combines F1 practice session data (FP1/FP2/FP3) with F1 Fantasy prices to provide swap recommendations for your fantasy team.

## Getting Started

### Development

```bash
npm install
npm run dev
```

With mock data (no external API calls):

```bash
USE_MOCK_DATA=true npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker

Build and run the production image:

```bash
docker build -t f1-fantasy .
docker run -p 3000:3000 f1-fantasy
```

With environment variables:

```bash
docker run -p 3000:3000 \
  -e ALLOWED_ORIGIN=https://example.com \
  f1-fantasy
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_MOCK_DATA` | Use fake data for UI development | `false` |
| `ALLOWED_ORIGIN` | CORS allowed origin for API routes | `http://localhost:3000` |

## Tech Stack

- [Next.js](https://nextjs.org) 16
- TypeScript
- React 19
- Tailwind CSS
