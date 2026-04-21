import { users } from "../../../packages/db/index.js";
type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createBearerToken() {
  const randomPart = crypto.randomUUID().replace(/-/g, "");
  return `mcp_${randomPart}`;
}

async function ensureUserBearerToken(user: Awaited<ReturnType<typeof users.findById>>) {
  if (!user) return user;
  if (typeof user.bearerToken === "string" && user.bearerToken.trim()) {
    return user;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await users.updateBearerToken(user.id, createBearerToken());
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== "P2002") {
        throw error;
      }
    }
  }

  throw new Error("Failed to assign user bearer token after retries");
}

type GoogleTokenInfo = {
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
};

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
}

async function verifyGoogleIdToken(idToken: string) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!response.ok) {
    return {
      error: Response.json({ error: "Invalid Google token" }, { status: 401 }),
    };
  }

  const tokenInfo = (await response.json()) as GoogleTokenInfo;
  const configuredClientId = getGoogleClientId();
  if (configuredClientId && tokenInfo.aud !== configuredClientId) {
    return {
      error: Response.json({ error: "Google token audience mismatch" }, { status: 401 }),
    };
  }

  const emailVerified = tokenInfo.email_verified === "true" || tokenInfo.email_verified === true;
  if (!tokenInfo.email || !emailVerified) {
    return {
      error: Response.json({ error: "Google account email is not verified" }, { status: 400 }),
    };
  }

  return { tokenInfo };
}

async function loginOrCreateUser(payload: { email?: string; name?: string; avatar?: string }) {
  if (!payload.email || !payload.email.trim()) {
    return {
      error: Response.json({ error: "Email is required" }, { status: 400 }),
    };
  }

  const normalizedEmail = normalizeEmail(payload.email);
  let user = await users.findByEmail(normalizedEmail);
  let isNewUser = false;

  if (!user) {
    user = await users.create({
      email: normalizedEmail,
      name: payload.name,
      avatar: payload.avatar,
      bearerToken: createBearerToken(),
    });
    isNewUser = true;
  }

  user = await ensureUserBearerToken(user);

  return {
    user,
    isNewUser
  };
}

export const usersController = {
  async list() {
    const allUsers = await users.list();
    return Response.json(allUsers);
  },

  async create(req: Request) {
    const data = (await req.json()) as { email?: string; name?: string; avatar?: string };
    const result = await loginOrCreateUser(data);
    if ("error" in result) return result.error;
    return Response.json(result, { status: result.isNewUser ? 201 : 200 });
  },

  async login(req: Request) {
    const data = (await req.json()) as { email?: string; name?: string; avatar?: string };
    const result = await loginOrCreateUser(data);
    if ("error" in result) return result.error;
    return Response.json(result);
  },

  async googleLogin(req: Request) {
    const data = (await req.json()) as { credential?: string };
    const credential = data.credential?.trim();

    if (!credential) {
      return Response.json({ error: "Google credential is required" }, { status: 400 });
    }

    const verification = await verifyGoogleIdToken(credential);
    if ("error" in verification) return verification.error;

    const result = await loginOrCreateUser({
      email: verification.tokenInfo.email,
      name: verification.tokenInfo.name,
      avatar: verification.tokenInfo.picture,
    });

    if ("error" in result) return result.error;
    return Response.json(result);
  },

  async getById(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const foundUser = await users.findById(request.params.id);
    const user = await ensureUserBearerToken(foundUser);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(user);
  }
};
