
import { LexedText, TokenIterator, t_plain_value, t_slash, t_colon,
    t_dot, t_question, t_integer, t_dash, t_dollar, t_star,
    t_lparen, t_rparen, t_equals, t_double_dash, t_space } from '../lexer'
import { Query, Tag, QueryNode, TagList } from '../query'
import { parseQueryFromTokens } from './parseQuery'
import { ParseError } from './ParseError'
import { TagSpecialValueType } from '../query/QueryTag';

function parseTagListFromTokens(it: TokenIterator): TagList | ParseError {
    const query = parseQueryFromTokens(it, { insideParen: true });
    
    if (query === null)
        return new TagList([]);
    
    if (query.t === 'parseError')
        return query;
    
    if (query.t === 'multistep')
        throw new Error("TagList parsing doesn't support multistep queries");
    
    if (query.t === 'tag') {
        // Single tag becomes a TagList with one tag
        return new TagList([query]);
    }
    
    if (query.t === 'query') {
        // Convert Query to TagList by combining command and tags
        const commandTag = new Tag(query.command);
        const allTags = [commandTag, ...query.tags];
        return new TagList(allTags);
    }
    
    throw new Error("Unexpected query type: " + (query as any).t);
}

export function parseQueryTagFromTokens(it: TokenIterator): Tag {

    const result = new Tag();

    it.tryConsume(t_space);

    let isSelfNamedParameter = false;

    if (it.tryConsume(t_dollar)) {
        isSelfNamedParameter = true;
    }

    let skipAttribute = it.nextIs(t_lparen);
    let isFlag = false;

    // Attribute
    if (!skipAttribute) {
        // Check for --flag syntax
        if (it.tryConsume(t_double_dash)) {
            isFlag = true;
            result.value = true;
        }

        result.attr = it.consumeAsUnquotedText();

        while (it.nextIs(t_plain_value)
                || it.nextIs(t_dot)
                || it.nextIs(t_dash)
                || it.nextIs(t_double_dash)
                || it.nextIs(t_integer)
                || it.nextIs(t_slash))
            result.attr += it.consumeAsUnquotedText();

        if (result.attr === '/')
            throw new Error("syntax error, attr was '/'");
    }

    if (isSelfNamedParameter)
        result.paramName = result.attr;

    if (it.tryConsume(t_question))
        result.isAttrOptional = true;

    let beforeParenLookahead = it.getPosition();
    it.tryConsume(t_space);
    if (it.tryConsume(t_lparen)) {
        let tagList: TagList | ParseError = parseTagListFromTokens(it);
        if (tagList.t === 'parseError')
            throw new Error((tagList as ParseError).message);

        tagList = tagList as TagList;

        if (!it.tryConsume(t_rparen))
            throw new Error("Expected )");

        result.value = tagList;
        return result;
    }
    it.restore(beforeParenLookahead);

    if (it.tryConsume(t_equals) || it.tryConsume(t_colon)) {
        it.skipSpaces();

        // Attribute value

        if (it.tryConsume(t_dollar)) {
            result.paramName = it.consumeAsUnquotedText();
        } else if (it.tryConsume(t_question)) {
            result.isValueOptional = true;
        } else if (it.tryConsume(t_star)) {
            result.value = { t: TagSpecialValueType.star };
        } else if (it.tryConsume(t_lparen)) {
            let tagList = parseTagListFromTokens(it);

            if (tagList.t === 'parseError')
                throw new Error("Parse error: " + tagList.t);

            tagList = tagList as TagList;

            if (!it.tryConsume(t_rparen))
                throw new Error('Expected )');

            result.value = tagList;
        } else {
            let firstTokenType = it.next().match;
            let tokenCount = 0;

            if (it.finished() || it.nextIs(t_rparen))
                throw it.createError("Expected a value");

            let strValue = it.consumeAsUnquotedText();
            tokenCount++;

            // Continue to parse tokens that are valid in a string literal.
            while (it.nextIs(t_plain_value) || it.nextIs(t_dot) || it.nextIs(t_slash) || it.nextIs(t_colon) || it.nextIs(t_integer)) {
                strValue += it.consumeAsUnquotedText();
                tokenCount++;
            }

            if (tokenCount === 1 && firstTokenType === t_integer) {
                // number value
                result.value = parseInt(strValue, 10);
            } else { 
                result.value = strValue;
            }

        }
    }

    return result;
}

export function parseQueryTag(str: string): Tag {
    const lexed = new LexedText(str);
    const it = lexed.startIterator();
    return parseQueryTagFromTokens(it);
}
