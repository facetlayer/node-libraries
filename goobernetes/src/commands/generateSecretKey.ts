import crypto from 'crypto';
import { getDatabase } from '../server/Database.ts';

export function generateSecretKey(): string {
    const db = getDatabase();
    const keyText = crypto.randomBytes(30).toString('hex');

    db.run(`insert into secret_key (key_text, created_at)
                values (?, datetime('now'))`, [
        keyText,
    ]);

    return keyText;
}