import { LexedText, t_line_comment, t_semicolon } from "../lexer/index.ts";
import { Query } from "../query/index.ts";
import type { QueryNode } from "../query/index.ts";
import { parseQueryFromTokens } from "./parseQuery.ts";

export function parseFile(fileContents: string): Query[] {
    let queries: Query[] = [];

    try {
        const lexed = new LexedText(fileContents, {
            bashStyleLineComments: true,
        });

        const it = lexed.startIterator();
        // const ctx: ParseContext = {};

        while (!it.finished()) {
            if (it.tryConsume(t_semicolon))
                continue;

            if (it.tryConsume(t_line_comment))
                continue;

            const result = parseQueryFromTokens(it);

            if (result === null)
                continue;

            if (result.t === 'parseError')
                throw result;

            if (result.t === 'tag') {
                queries.push(new Query(result.attr, []));
                continue;
            }

            if (result.t === 'query') {
                if (result.tags.length === 0)
                    continue;

                queries.push(result);
                continue;
            }

            if (result.t === 'multistep') {
                throw new Error(`Didn't expect multistep query in parseFile: ` + result.toQueryString() );
            }
        }

        return queries;
    } catch (err) {
        throw err;
    }
}

