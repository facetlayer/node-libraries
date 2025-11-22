import { QueryLike } from "./Query";

export function queryToString(queryLike: QueryLike): string {
    if (typeof queryLike === 'string')
        return queryLike;

    if (queryLike?.t === 'query') {
        return queryLike.toQueryString();
    }

    throw new Error(`Unsupported queryLike type: ${(queryLike as any)?.t || typeof queryLike}`);
}