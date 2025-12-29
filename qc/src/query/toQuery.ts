
import { Query } from './Query.ts'
import type { QueryLike, QueryNode } from './Query.ts'
import { parseQuery } from '../parser/parseQuery.ts'

export function toQueryNode(queryLike: QueryLike): QueryNode {
    if (queryLike && (queryLike as Query)?.t === 'query')
        return queryLike as Query;

    const parseResult = parseQuery(queryLike as string);

    if (!parseResult)
        return new Query("", []);

    return parseResult as QueryNode;
}

export function toQuery(queryLike: QueryLike): Query {
    if (queryLike && (queryLike as Query)?.t === 'query')
        return queryLike as Query;

    const parseResult = parseQuery(queryLike as string);

    if (!parseResult)
        return new Query("", []);

    if (parseResult.t !== 'query')
        throw new Error("toQuery: input didn't parse into a query: " + JSON.stringify(queryLike));

    return parseResult as Query;
}
