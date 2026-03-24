# api

To install dependencies:

```bash
bun install
```

Create `api/.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/ai_referrer?schema=public"
GOOGLE_GENERATIVE_AI_API_KEY=your_google_generative_ai_api_key
GOOGLE_CLIENT_ID=your_google_web_client_id
GOOGLE_CLIENT_SECRET=your_google_web_client_secret
```

To run:

```bash
bun run dev
```

This project was created using `bun init` in bun v1.3.8. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
