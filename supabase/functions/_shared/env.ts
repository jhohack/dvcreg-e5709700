export function envValue(key: string, defaultValue?: string): string | undefined {
  const value = Deno.env.get(key)?.trim()
  return value && value !== "" ? value : defaultValue
}

export function requireEnv(key: string): string {
  const value = envValue(key)
  if (!value) {
    throw new Error(`Missing required server configuration: ${key}`)
  }

  return value
}

export function intEnv(key: string, defaultValue: number): number {
  const raw = envValue(key)
  if (!raw) {
    return defaultValue
  }

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : defaultValue
}
