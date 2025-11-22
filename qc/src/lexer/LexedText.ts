// Simplified lexed text without table dependencies
import { LexerSettings } from './LexerSettings'
import { lexTextToTokenList } from './lexifyString'
import { t_space, t_newline, t_tab, t_quoted_string } from './tokens'
import { Token, getTokenText } from './Token'
import { TokenIterator, Options as IteratorOptions } from './TokenIterator'
import { Query, Tag } from '../query'
import unescape from './unescape'

interface SourceLine {
    lineNumber: number
    tokenStart: number
    tokenEnd: number
    firstNonIndentToken: number
}

export interface TokenRange {
    tokenStart: number
    tokenEnd: number
}

export interface TextRange {
    textStart: number
    textEnd: number
}

export type Range = TokenRange | TextRange | number;

export interface LineRangeOptions {
    includeIndent?: boolean
    includeNewline?: boolean
}

export class LexedText {
    originalString: string
    tokens: Token[]
    tokensList: Token[]
    lines: Map<number, SourceLine> = new Map()

    constructor(str: string, settings: LexerSettings = {}) {
        this.originalString = str;
        this.tokens = [];

        let tokenIndex = 0;
        for (const token of lexTextToTokenList(str, settings)) {
            token.tokenIndex = tokenIndex;
            this.tokens.push(token);

            const isIndent = token.match === t_space || token.match === t_tab;

            for (let lineNumber = token.lineStart; lineNumber <= token.lineEnd; lineNumber++) {
                if (this.lines.has(lineNumber)) {
                    const line = this.lines.get(lineNumber)!;
                    line.tokenEnd = tokenIndex;

                    if (!isIndent && line.firstNonIndentToken === -1)
                        line.firstNonIndentToken = tokenIndex;

                } else {
                    this.lines.set(lineNumber, {
                        lineNumber,
                        tokenStart: tokenIndex,
                        tokenEnd: tokenIndex,
                        firstNonIndentToken: isIndent ? -1 : tokenIndex
                    });
                }
            }

            tokenIndex++;
        }

        this.tokensList = this.tokens;
    }

    lastTextIndex() {
        return this.originalString.length;
    }

    resolveRange(range: Range): TextRange {
        if (typeof range === 'number') {
            range = { tokenStart: range, tokenEnd: range } as TokenRange;
        }

        if ((range as TokenRange).tokenStart != null) {
            range = range as TokenRange;
            const firstToken = this.tokens[range.tokenStart];
            const lastToken = this.tokens[range.tokenEnd];
            return { textStart: firstToken.textStart, textEnd: lastToken.textEnd }
        }

        if ((range as TextRange).textStart != null) {
            return range as TextRange;
        }

        throw new Error("unsupported range");
    }

    getRangeForLine(lineNumber: number, options: LineRangeOptions = {}): TokenRange {
        const found = this.lines.get(lineNumber);
        if (!found)
            throw new Error("line number not found: " + lineNumber);

        const range: TokenRange = {
            tokenStart: found.tokenStart,
            tokenEnd: found.tokenEnd,
        }

        if (options.includeIndent === false) {
            const it = this.startIterator(range.tokenStart);
            it.tryConsume(t_space);
            range.tokenStart = it.getPosition();
        }
        
        if (options.includeNewline === false) {
            const it = this.startIterator(range.tokenEnd);
            it.tryConsume(t_newline);
            range.tokenEnd = it.getPosition() - 1;
        }

        return range;
    }

    rangeText(range: Range): string {
        const resolved = this.resolveRange(range);
        return this.originalString.slice(resolved.textStart, resolved.textEnd);
    }

    getText(range: Range): string {
        return this.rangeText(range);
    }

    getUnquotedText(token: Token | Range): string {
        if (typeof token === 'object' && 'match' in token) {
            // It's a Token
            const t = token as Token;
            if (t.match === t_quoted_string) {
                // Strip quotes and unescape
                const str = this.originalString.slice(t.textStart + 1, t.textEnd - 1);
                return unescape(str);
            }
            return this.originalString.slice(t.textStart, t.textEnd);
        } else {
            // It's a Range
            return this.unescapeText(token as Range);
        }
    }

    startIterator(startPosition = 0, options: IteratorOptions = {}): TokenIterator {
        return new TokenIterator(this, startPosition, options);
    }

    iterateRange(range: Range, options: IteratorOptions = {}): TokenIterator {
        const resolved = this.resolveRange(range);
        let tokenStart = this.findTokenAtTextIndex(resolved.textStart);
        let tokenEnd = this.findTokenAtTextIndex(resolved.textEnd);

        // Create a new LexedText with just the tokens in range
        const subText = new LexedText('');
        subText.tokens = this.tokens.slice(tokenStart, tokenEnd + 1);
        subText.tokensList = subText.tokens;
        subText.originalString = this.originalString;
        return new TokenIterator(subText, 0, options);
    }

    findTokenAtTextIndex(textIndex: number): number {
        for (let i = 0; i < this.tokens.length; i++) {
            if (textIndex >= this.tokens[i].textStart && textIndex <= this.tokens[i].textEnd) {
                return i;
            }
        }
        return this.tokens.length - 1;
    }

    leadingIndent(range: Range): number {
        const resolved = this.resolveRange(range);
        const tokenStart = this.findTokenAtTextIndex(resolved.textStart);
        
        let indentCount = 0;
        for (let i = tokenStart; i >= 0; i--) {
            const token = this.tokens[i];
            if (token.match === t_newline) {
                break;
            }
            if (token.match === t_space) {
                indentCount += getTokenText(token, this.originalString).length;
            } else if (token.match === t_tab) {
                indentCount += getTokenText(token, this.originalString).length * 4; // Assume 4 spaces per tab
            } else if (token.match !== t_space && token.match !== t_tab) {
                break;
            }
        }
        return indentCount;
    }

    unescapeText(range: Range): string {
        const token = this.tokens[this.findTokenAtTextIndex(this.resolveRange(range).textStart)];
        if (token.match === t_quoted_string) {
            // Strip quotes and unescape
            const str = this.originalString.slice(token.textStart + 1, token.textEnd - 1);
            return unescape(str);
        }
        return this.rangeText(range);
    }
}