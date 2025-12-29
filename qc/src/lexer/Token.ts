
import type { TokenDef } from './TokenDef.ts'

export interface Token {
    match: TokenDef
    length: number
    tokenIndex: number
    textStart: number
    textEnd: number
    lineStart: number
    lineEnd: number
    columnStart: number
    leadingIndent: number
    pairsWithIndex?: number
    getText?: (originalString: string) => string
}

export function getTokenText(token: Token, originalString: string): string {
    return originalString.slice(token.textStart, token.textEnd);
}
