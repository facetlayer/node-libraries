import { getDatabase } from "./Database.ts";

export function validateSecretKey(keyText: string): boolean {
    const db = getDatabase();
    const result = db.get(`select key_text from secret_key where key_text = ?`, [keyText]);
    return result !== undefined;
}