import { parseFile } from '@facetlayer/qc';
import { FileMatchRule, IncludeRule, ExcludeRule, IgnoreDestinationRule, IgnoreRule, RuleType } from './FileMatchRule';

export function parseRulesFile(ruleConfig: string): FileMatchRule[] {
    const queries = parseFile(ruleConfig);
    const rules: FileMatchRule[] = [];

    for (const query of queries) {
        const command = query.command;
        const pattern = query.tags?.[0]?.attr;

        if (!pattern) {
            throw new Error(`Missing pattern for ${command} rule`);
        }

        switch (command) {
            case 'include':
                rules.push({
                    type: RuleType.Include,
                    pattern: pattern
                } as IncludeRule);
                break;
            case 'exclude':
                rules.push({
                    type: RuleType.Exclude,
                    pattern: pattern
                } as ExcludeRule);
                break;
            case 'ignore-destination':
                rules.push({
                    type: RuleType.IgnoreDestination,
                    pattern: pattern
                } as IgnoreDestinationRule);
                break;
            case 'ignore':
                rules.push({
                    type: RuleType.Ignore,
                    pattern: pattern
                } as IgnoreRule);
                break;
            default:
                // Ignore unrecognized rules.
        }
    }

    return rules;
}