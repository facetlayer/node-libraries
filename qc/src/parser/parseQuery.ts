
import { LexedText, TokenIterator, t_plain_value, t_bar, t_slash,
    t_integer, t_rparen, t_right_arrow, t_comma, t_semicolon,
    t_line_comment,
    t_space,
    t_newline} from '../lexer/index.ts'
import type { Token } from '../lexer/index.ts'
import { parseQueryTagFromTokens } from './parseQueryTag.ts'
import { ParseError } from './ParseError.ts'
import { Tag, Query } from '../query/index.ts'
import type { QueryNode } from '../query/index.ts'
import { MultistepQuery } from '../query/Query.ts';

export interface QueryParseContext {
    insideParen?: boolean;
}

export interface TagParseContext {
    insideParen?: boolean;
    startingToken: Token;
}

function maybeParseVerbWithCount(it: TokenIterator): Tag[] {
    let startPos = it.position;
    const ctx = { startingToken: it.next() };

    if (it.nextText() !== "limit" && it.nextText() !== "last")
        return null;

    const verb = it.nextText();
    it.consume();
    it.skipNewlines();

    if (!it.nextIs(t_integer)) {
        it.position = startPos;
        return null;
    }

    const count = it.nextText();
    it.consume(t_integer);

    // Success
    const tags: Tag[] = [
        new Tag(verb, null),
        new Tag('count', count),
    ];

    for (const entry of parseTags(it, ctx)) {
        tags.push(entry);
    }

    return tags;
}

function maybeParseWaitVerb(it: TokenIterator): Tag[] {
    let startPos = it.position;
    const ctx = { startingToken: it.next() };

    if (it.nextText() !== "wait")
        return null;

    const verb = it.nextText();
    it.consume();
    it.skipNewlines();

    if (!it.nextIs(t_integer)) {
        it.position = startPos;
        return null;
    }

    const duration = it.nextText();
    it.consume(t_integer);

    // Success
    const tags: Tag[] = [
        new Tag(verb, null),
        new Tag('duration', null)
    ];

    for (const tag of parseTags(it, ctx)) {
        tags.push(tag);
    }

    return tags;
}

function maybeParseRename(it: TokenIterator): Tag[] {
    let startPos = it.position;
    const ctx = { startingToken: it.next() };

    if (it.nextText() !== "rename")
        return null;

    const verb = it.nextText();
    it.consume();
    it.skipNewlines();

    let from: string;
    let to: string;

    if (!it.nextIs(t_plain_value)) {
        it.position = startPos;
        return null;
    }

    from = it.consumeAsText();
    it.skipNewlines();

    if (!it.nextIs(t_right_arrow)) {
        it.position = startPos;
        return null;
    }

    it.consume(t_right_arrow);
    it.skipNewlines();

    if (!it.nextIs(t_plain_value)) {
        it.position = startPos;
        return null;
    }

    to = it.consumeAsText();

    // Success
    const tags: Tag[] = [
        new Tag(verb, null),
        new Tag('from', from),
        new Tag('to', to),
    ]

    for (const tag of parseTags(it, ctx)) {
        tags.push(tag);
    }

    return tags;
}

const specialSyntaxPaths = [
    maybeParseVerbWithCount,
    maybeParseRename,
    maybeParseWaitVerb,
];

function* parseTags(it: TokenIterator, ctx: TagParseContext) {
    let tagCount = 0;

    while (true) {
        if (it.tryConsume(t_space) || it.tryConsume(t_newline) || it.tryConsume(t_line_comment))
            continue;

        if (it.finished() || it.nextIs(t_bar) || it.nextIs(t_slash) || it.nextIs(t_rparen) || it.nextIs(t_semicolon))
            break;

        // Handle significant indentation. Stop parsing if we've reached a new line which is not indented.
        const isOnFollowingLine = it.next().lineStart !== ctx.startingToken.lineStart;
        const indentIsSameOrLower = it.next().leadingIndent <= ctx.startingToken.leadingIndent;

        if (!ctx.insideParen && (tagCount > 0) && isOnFollowingLine && indentIsSameOrLower) {
            break;
        }

        const tag: Tag = parseQueryTagFromTokens(it);
        tagCount++;

        it.tryConsume(t_comma);

        yield tag;
    }
}

export function parseSingleQueryFromTokens(it: TokenIterator, ctx: QueryParseContext): Query | ParseError | null {
    it.skipNewlines();
    it.skipSpaces();

    const tagCtx: TagParseContext = { startingToken: it.next(), insideParen: ctx.insideParen };

    // Special syntaxes
    for (const specialPathHandler of specialSyntaxPaths) {
        const parseSuccess = specialPathHandler(it);
        if (parseSuccess) {
            const command = parseSuccess[0].attr;
            const tags = parseSuccess.slice(1);
            return new Query(command, tags);
        }
    }
    
    const tags: Tag[] = Array.from(parseTags(it, tagCtx));

    if (tags.length === 0) {
        return null;
    }

    const command = tags[0].attr;
    const tagArgs = tags.slice(1);
    return new Query(command, tagArgs);
}

export function parseQueryFromTokens(it: TokenIterator, ctx: QueryParseContext = {}): QueryNode | ParseError {
    const steps: Query[] = [];
    let isFirst = true;
    let isTransform = false;

    while (!it.finished()) {
        if (it.tryConsume(t_space) || it.tryConsume(t_line_comment))
            continue;

        if (it.nextIs(t_bar) || it.nextIs(t_slash)) {
            // Queries can start with a leading | , which means to interpret this as a transform.
            // Consume it and loop (and isFirst will be false on next iteration)
            if (isFirst)
                isTransform = true;
            it.consume();
            continue;
        }

        const step: Query | ParseError | null = parseSingleQueryFromTokens(it, ctx);
        if (step === null)
            continue;
        if (step.t === 'parseError')
            return step;

        steps.push(step as Query);

        if (!it.tryConsume(t_bar) && !it.tryConsume(t_slash))
            break;

        isFirst = false;
    }

    if (steps.length === 0)
        return null;

    if (steps.length === 1)
        return steps[0];

    return new MultistepQuery(steps);
}

/*
 * Parse a single-step query.
 *
 * Does not support multistep queries (use parseMultiQuery for that)
 */
export function parseQuery(str: string): Query {
    const lexed = new LexedText(str);
    const it = lexed.startIterator();
    const result = parseQueryFromTokens(it);

    if (!result)
        return new Query("", []);

    if (result.t === 'parseError')
        throw result;

    if (result.t === 'multistep')
        throw new Error("parseQuery didn't expect a multistep query: " + str);

    if (result.t === 'tag')
        return new Query(result.attr, []);

    return result;
}

/*
 * Parse a query (might result in a single-step or multi-step)
 */
export function parseMultiStepQuery(str: string): Query | MultistepQuery {
    try {
        const lexed = new LexedText(str);
        const it = lexed.startIterator();
        const result = parseQueryFromTokens(it);

        if (result.t === 'parseError')
            throw result;

        if (result.t === 'tag')
            return new Query(result.attr, []);

        return result;
    } catch (err) {
        throw new Error(`Failed to parse query "${str}": ${err.message}`);
    }
}
