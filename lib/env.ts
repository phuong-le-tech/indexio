export interface AppEnv {
  DATABASE_URL: string;
  APP_PASSWORD: string;
  SESSION_SECRET: string;
  COOKIE_SECURE: boolean;
}

export function validateEnv(env: NodeJS.ProcessEnv): AppEnv;
export function validateEnv(): AppEnv {
  throw new Error("Not implemented: validateEnv");
}
