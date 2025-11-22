import { it, expect } from 'vitest'
import { parseRulesFile } from '../parseRulesFile'
import { RuleType } from '../FileMatchRule'

it("parses include rule", () => {
    const rules = parseRulesFile(`include src/`);

    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({
        type: RuleType.Include,
        pattern: 'src/'
    });
});

it("parses exclude rule", () => {
    const rules = parseRulesFile(`exclude node_modules`);

    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({
        type: RuleType.Exclude,
        pattern: 'node_modules'
    });
});

it("parses ignore-destination rule", () => {
    const rules = parseRulesFile(`ignore-destination .cache`);

    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({
        type: RuleType.IgnoreDestination,
        pattern: '.cache'
    });
});

it("parses ignore rule", () => {
    const rules = parseRulesFile(`ignore .DS_Store`);

    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({
        type: RuleType.Ignore,
        pattern: '.DS_Store'
    });
});

it("parses multiple rules", () => {
    const rules = parseRulesFile(`
        include src/
        include assets/
        exclude node_modules
        ignore .DS_Store
    `);

    expect(rules).toHaveLength(4);
    expect(rules[0]).toEqual({ type: RuleType.Include, pattern: 'src/' });
    expect(rules[1]).toEqual({ type: RuleType.Include, pattern: 'assets/' });
    expect(rules[2]).toEqual({ type: RuleType.Exclude, pattern: 'node_modules' });
    expect(rules[3]).toEqual({ type: RuleType.Ignore, pattern: '.DS_Store' });
});

it("ignores unrecognized commands", () => {
    const rules = parseRulesFile(`
        include src/
        unknown-command foo
        exclude bar
    `);

    expect(rules).toHaveLength(2);
    expect(rules[0]).toEqual({ type: RuleType.Include, pattern: 'src/' });
    expect(rules[1]).toEqual({ type: RuleType.Exclude, pattern: 'bar' });
});

it("ignores commands without patterns", () => {
    // When a command has no argument, qc parser returns empty array
    const rules = parseRulesFile(`include`);

    expect(rules).toHaveLength(0);
});

it("returns empty array for empty input", () => {
    const rules = parseRulesFile(``);

    expect(rules).toHaveLength(0);
});

it("returns empty array for whitespace-only input", () => {
    const rules = parseRulesFile(`

    `);

    expect(rules).toHaveLength(0);
});
