export enum RuleType {
    Include = 'include',
    Exclude = 'exclude',
    IgnoreDestination = 'ignore-destination',
    Ignore = 'ignore'
}

export interface IncludeRule {
    type: RuleType.Include;
    pattern: string;
}

export interface ExcludeRule {
    type: RuleType.Exclude;
    pattern: string;
}

export interface IgnoreDestinationRule {
    type: RuleType.IgnoreDestination;
    pattern: string;
}

export interface IgnoreRule {
    type: RuleType.Ignore;
    pattern: string;
}

export type FileMatchRule = IncludeRule | ExcludeRule | IgnoreDestinationRule | IgnoreRule;