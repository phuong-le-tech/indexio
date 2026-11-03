export interface AppEnv {
  DATABASE_URL: string;
  APP_PASSWORD: string;
  SESSION_SECRET: string;
  COOKIE_SECURE: boolean;
}

export function validateEnv(env: NodeJS.ProcessEnv): AppEnv {
  const required = ["DATABASE_URL", "APP_PASSWORD", "SESSION_SECRET"] as const;
  for (const key of required) {
    const value = env[key];
    if (!value?.trim()) throw new Error(`${key} env var is required`);
    if (env.NODE_ENV === "production" && value.toLowerCase().includes("change-me")) {
      throw new Error(`${key} must not contain a placeholder in production`);
    }
  }
  if (env.NODE_ENV === "production" && env.SESSION_SECRET!.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters in production");
  }
  if (env.COOKIE_SECURE !== undefined && !["true", "false"].includes(env.COOKIE_SECURE)) {
    throw new Error("COOKIE_SECURE must be true or false");
  }
  return {
    DATABASE_URL: env.DATABASE_URL!,
    APP_PASSWORD: env.APP_PASSWORD!,
    SESSION_SECRET: env.SESSION_SECRET!,
    COOKIE_SECURE: env.COOKIE_SECURE === "true",
  };
}
