
import { toQuery } from '..';
import { it, expect } from 'vitest'
import { queryToString } from '../queryToString.ts';

it("handles bidirectional tests", () => {
    function bidirectionalTest(queryStr: string) {
        const parsed = toQuery(queryStr);
        const backToStr = queryToString(parsed);
        expect(backToStr).toEqual(queryStr);
    }

    bidirectionalTest("a");
    bidirectionalTest("a b");
    bidirectionalTest("cmd a=1 b");
    bidirectionalTest("cmd func(a)");   // The serializer uses parentheses format
    bidirectionalTest("cmd func(a b)");
});