
import { Query, toQuery } from '..';
import { it, expect, describe } from 'vitest'

describe("withInlinedParams", () => {
    it("withInlinedParms handles a nested query", () => {
        const query = toQuery("cmd func(start a=$a_param b=$b_param)");
        const params = new Map();
        params.set("a_param", "123");
        params.set("b_param", "456");

        const inlined = query.withInlinedParams(params);

        const nested = inlined.getNestedTagList("func");
        expect(nested.getStringValue("a")).toEqual("123");
        expect(nested.getStringValue("b")).toEqual("456");
    });

    it("handles a tag where the paramName is different than the attr", () => {
        const query = toQuery("cmd func(start a=$b)");
        const params = new Map();
        params.set("b", "123");

        const inlined = query.withInlinedParams(params);
        const nested = inlined.getNestedTagList("func");
        expect(nested.getStringValue("a")).toEqual("123");
    });
});