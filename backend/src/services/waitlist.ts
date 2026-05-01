export interface WaitlistEntry {
  email: string
  joinedAt: string
  country: string | null
}

export interface WaitlistResult {
  success: boolean
  message: string
  entry: WaitlistEntry
}

export const WaitlistService = {
  async addEmail(email: string, country: string | null, db: D1Database): Promise<WaitlistResult> {
    const joinedAt = new Date().toISOString()

    await db
      .prepare('INSERT OR IGNORE INTO waitlist (email, joined_at, country) VALUES (?, ?, ?)')
      .bind(email, joinedAt, country)
      .run()

    const entry = await db
      .prepare('SELECT email, joined_at as joinedAt, country FROM waitlist WHERE email = ?')
      .bind(email)
      .first<WaitlistEntry>()

    const isNew = entry!.joinedAt === joinedAt

    return {
      success: true,
      message: isNew ? '¡Te agregamos a la lista de espera!' : '¡Ya estás en la lista de espera!',
      entry: entry!,
    }
  },

  async findAll(db: D1Database): Promise<WaitlistEntry[]> {
    const result = await db
      .prepare('SELECT email, joined_at as joinedAt, country FROM waitlist ORDER BY joined_at ASC')
      .all<WaitlistEntry>()
    return result.results
  },

  async findByEmail(email: string, db: D1Database): Promise<WaitlistEntry | undefined> {
    const entry = await db
      .prepare('SELECT email, joined_at as joinedAt, country FROM waitlist WHERE email = ?')
      .bind(email)
      .first<WaitlistEntry>()
    return entry ?? undefined
  },
}
