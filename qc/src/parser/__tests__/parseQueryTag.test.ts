import { parseQueryTag } from "../parseQueryTag";
import { it, expect, describe } from 'vitest'
import { Tag } from '../../query'
import { TagSpecialValueType } from "../../query/QueryTag";

function checkTag(actual: any, desired: any) {
    expect(actual.attr).toEqual(desired.attr);
    expect(actual.value).toEqual(desired.value);
    expect(actual.paramName).toEqual(desired.paramName);
    expect(actual.isParameter()).toEqual(desired.isParameter || false);
}

describe("with sample: 'theattr=123'", () => {
    it("should return a single query tag with attr of 'theattr' and a value of '123'", () => {
        const parsed: Tag = parseQueryTag('theattr=123');

        // Check that the tag has attr = 'theattr' and value = '123'
        expect(parsed.attr).toEqual('theattr');
        expect(parsed.getStringValue()).toEqual('123');
    });
});

it("parses a tag with just an attr", () => {
    checkTag(parseQueryTag("theattr"), {
        attr: "theattr",
        value: undefined,
    });
});

it("parses attr=value", () => {
  checkTag(parseQueryTag("theattr=123"), {
    attr: "theattr",
    value: 123,
  });
});

it("parses allowed characters in attr", () => {
  checkTag(parseQueryTag("the/attr.123=123"), {
    attr: "the/attr.123",
    value: 123,
  });
});

it("parses a URL", () => { 
  checkTag(parseQueryTag("url=https://example.com"), {
    attr: "url",
    value: "https://example.com",
  });
});

it("parses a URL with port", () => { 
  checkTag(parseQueryTag("url=https://example.com:8080"), {
    attr: "url",
    value: "https://example.com:8080",
  });
});

it("parses an attr with dashes", () => { 
  checkTag(parseQueryTag("test-tag"), {
    attr: "test-tag",
  });

  checkTag(parseQueryTag("intake-facts"), {
    attr: "intake-facts",
  });

  expect(
    parseQueryTag("test-tag").toQueryString()
  ).toEqual("test-tag");
});

it(`parses attr="value"`, () => {
  checkTag(parseQueryTag('theattr="123"'), {
    attr: "theattr",
    value: '123',
  });
});

it(`parses $attr`, () => {
  checkTag(parseQueryTag('$theattr'), {
    attr: "theattr",
    value: undefined,
    paramName: 'theattr',
    isParameter: true,
  });
});

it(`parses attr=$paramName`, () => {
  checkTag(parseQueryTag('theattr=$paramName'), {
    attr: "theattr",
    value: undefined,
    paramName: 'paramName',
    isParameter: true,
  });
});

it(`parses attr=*"`, () => {
    const parsed: Tag = parseQueryTag('attr=*');

    // Check that the tag has attr = 'theattr' and value = '123'
    expect(parsed.attr).toEqual('attr');
    expect((parsed.value as any).t).toEqual(TagSpecialValueType.star);
});

it("parses attr=(tuple)", () => {
    const parsed = parseQueryTag("theattr=(a b c)");

    expect(parsed.attr).toEqual('theattr');
    expect(parsed.t).toEqual('tag');
    expect((parsed.value as any).t).toEqual('taglist');
    const tags = (parsed.value as any).tags;
    expect(tags.length).toEqual(3);
    expect(tags[0].attr).toEqual("a");
    expect(tags[0].t).toEqual("tag");
    expect(tags[1].attr).toEqual("b");
    expect(tags[1].t).toEqual("tag");
    expect(tags[2].attr).toEqual("c");
    expect(tags[2].t).toEqual("tag");
});

it("parses attr(tuple)", () => {
  const parsed = parseQueryTag("theattr(a b c)");
  expect(parsed.attr).toEqual('theattr');
  expect((parsed.value as any).t).toEqual('taglist');
  const tags = (parsed.value as any).tags;
  expect(tags.length).toEqual(3);
  expect(tags[0].attr).toEqual("a");
  expect(tags[0].t).toEqual("tag");
  expect(tags[1].attr).toEqual("b");
  expect(tags[1].t).toEqual("tag");
  expect(tags[2].attr).toEqual("c");
  expect(tags[2].t).toEqual("tag");
});

it("parses attr (tuple)", () => {
  const parsed = parseQueryTag("theattr (a b c)");
  expect(parsed.attr).toEqual('theattr');
  expect((parsed.value as any).t).toEqual('taglist');
  const tags = (parsed.value as any).tags;
  expect(tags.length).toEqual(3);
  expect(tags[0].attr).toEqual("a");
  expect(tags[0].t).toEqual("tag");
  expect(tags[1].attr).toEqual("b");
  expect(tags[1].t).toEqual("tag");
  expect(tags[2].attr).toEqual("c");
  expect(tags[2].t).toEqual("tag");
});

it("parses ? for optional", () => {
  const tag1 = parseQueryTag("x?");
  expect(tag1.attr).toEqual("x");
  expect(tag1.isAttrOptional).toEqual(true);
  expect(tag1.t).toEqual("tag");
  
  const tag2 = parseQueryTag("x?=val");
  expect(tag2.attr).toEqual("x");
  expect(tag2.isAttrOptional).toEqual(true);
  expect(tag2.t).toEqual("tag");
  expect(tag2.value).toEqual('val');
});

describe("with sample: 'theattr:(nested-query)'", () => {
    it("should return a query tag with a nested query having 'nested-query' as the first tag", () => {
        const parsed = parseQueryTag('theattr:(nested-query)');

        // Check that the tag has attr = 'theattr' and nested query with 'nested-query'
        expect(parsed.attr).toEqual('theattr');
        expect(parsed.isTagList()).toEqual(true);
        expect(parsed.getTagList().tags[0].attr).toEqual('nested-query');
    });

    it("should return the same thing if there is a space between the colon and the paren", () => {
        const parsed = parseQueryTag('theattr: (nested-query)');

        // Check that the tag has attr = 'theattr' and nested query with 'nested-query' even with space
        expect(parsed.attr).toEqual('theattr');
        expect(parsed.isTagList()).toEqual(true);
        expect(parsed.getTagList().tags[0].attr).toEqual('nested-query');
    });
});

describe("with sample: 'theattr:'", () => {
    it("throws an error if nothing is after the colon", () => {
        expect(() => parseQueryTag('theattr:')).toThrow();
    });

    it("throws an error if there is a closing parentheses after the colon", () => {
        expect(() => parseQueryTag('theattr:)')).toThrow();
    });
});

