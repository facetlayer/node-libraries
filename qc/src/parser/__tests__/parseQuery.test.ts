import { parseQuery } from "../parseQuery.ts";
import { it, expect } from 'vitest'

it("parseQuery parses a single step query", () => {
    const result = parseQuery("a b c");
    expect(result.command).toEqual('a');
    expect(result.tags[0].attr).toEqual('b');
    expect(result.tags[1].attr).toEqual('c');
});

it("parseQuery ignores commas between tags", () => {
    const result = parseQuery("a,b,c");

    expect(result.command).toEqual('a');
    expect(result.tags[0].attr).toEqual('b');
    expect(result.tags[1].attr).toEqual('c');
})

it("parseQuery ignores commas inside expressions", () => {
    const result = parseQuery("cmd get(b,c)");
    const get = result.tags[0];

    expect(result.command).toEqual('cmd');
    expect(get.getTagList().tags[0].attr).toEqual('b');
    expect(get.getTagList().tags[1].attr).toEqual('c');
});

it("parseQuery throws an error on a piped query", () => {
    let error;

    try {
        parseQuery("a b=2 | join b c=1");
    } catch (e) {
        error = e;
    }

    expect(error?.message).include("parseQuery didn't expect a multistep query");
});

it("parseQuery handles tags with no attr", () => {
    const parsed = parseQuery(`cmd tag=(key example "string")`);
    expect(parsed.t).toEqual('query');
    expect(parsed.command).toEqual('cmd');
    delete (parsed as any).tags[0].value.tagsByAttr;
    expect(parsed.tags).toMatchInlineSnapshot(`
      [
        Tag {
          "attr": "tag",
          "frozen": false,
          "isAttrOptional": false,
          "isValueOptional": false,
          "paramName": undefined,
          "t": "tag",
          "value": TagList {
            "t": "taglist",
            "tags": [
              Tag {
                "attr": "key",
                "frozen": false,
                "isAttrOptional": false,
                "isValueOptional": false,
                "paramName": undefined,
                "t": "tag",
                "value": undefined,
              },
              Tag {
                "attr": "example",
                "frozen": false,
                "isAttrOptional": false,
                "isValueOptional": false,
                "paramName": undefined,
                "t": "tag",
                "value": undefined,
              },
              Tag {
                "attr": "string",
                "frozen": false,
                "isAttrOptional": false,
                "isValueOptional": false,
                "paramName": undefined,
                "t": "tag",
                "value": undefined,
              },
            ],
          },
        },
      ]
    `);
});

it("parseQuery handles --flag syntax", () => {
    const parsed = parseQuery(`call --flag`);
    expect(parsed.command).toEqual('call');
    expect(parsed.tags[0].attr).toEqual('flag');
    expect(parsed.tags[0].value).toEqual(true);
});