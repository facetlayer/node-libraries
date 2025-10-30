import z from "zod";

export const zEnvSchema = z.object({
  sqliteDatabasePath: z.string().min(1, 'Database path is required'),
  apiBaseUrl: z.string().optional(),
  webBaseUrl: z.string().optional(),
  logFilePath: z.string().optional(),
  port: z.number().optional(),
  enableTestEndpoints: z.boolean().optional(),
  enableDesktopLocalAuth: z.boolean().optional(),
});

export type EnvSchema = z.infer<typeof zEnvSchema>;