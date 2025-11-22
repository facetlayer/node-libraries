
import { Tag, TagValue } from './QueryTag'
import { TagList } from './TagList'

export type QueryLike = string | Query | QueryNode
export type QueryNode = MultistepQuery | Query | Tag
export { Tag } from './QueryTag'
export { TagList } from './TagList'

export class MultistepQuery {
    t: 'multistep' = 'multistep'
    steps: Query[]

    constructor(steps: Query[]) {
        this.steps = steps
    }

    toQueryString() {
        let sections = this.steps.map(step => step.toQueryString());
        return sections.join(' | ');
    }
}

export class Query {
    t: 'query' = 'query'
    command: string
    tags: Tag[]
    tagsByAttr: Map<string, Tag>
    frozen: boolean = false

    constructor(command: string, tags: Tag[] = []) {
        this.command = command;
        this.tags = tags;
        this._refresh();
    }

    addTag(attr: string, value: TagValue = null) {
        if (this.frozen)
            throw new Error("Query is frozen");

        const tag = new Tag(attr, value);
        this.tags.push(tag);
        return tag;
    }

    freeze() {
        if (this.frozen)
            return;
        this.frozen = true;
        for (const tag of this.tags)
            tag.freeze();
        Object.freeze(this);
    }

    has(attr: string) {
        return this.tagsByAttr.has(attr);
    }

    hasAttr(attr: string) {
        return this.tagsByAttr.has(attr);
    }

    hasValue(attr: string) {
        const tag = this.getAttr(attr);
        return tag && tag.hasValue();
    }

    getValue(attr: string) {
        const tag = this.getAttr(attr);
        if (!tag)
            throw new Error("no value for: " + attr);
        return tag.getValue();
    }

    getStringValue(attr: string) {
        const tag = this.getAttr(attr);
        if (!tag)
            throw new Error("no value for: " + attr);
        return tag.getStringValue();
    }

    getString(attr: string) {
        const tag = this.getAttr(attr);
        if (!tag)
            throw new Error("no value for: " + attr);
        return tag.getStringValue();
    }
    
    getNumberValue(attr: string) {
        const tag = this.getAttr(attr);
        if (!tag)
            throw new Error("no value for: " + attr);
        return tag.getNumberValue();
    }

    getQueryValue(attr: string) {
        const tag = this.getAttr(attr);
        if (!tag)
            throw new Error("no value for: " + attr);
        return tag.getQuery();
    }

    getNumberOptional(attr: string, defaultValue?: number) {
        const tag = this.getAttr(attr);
        if (!tag || !tag.hasValue())
            return defaultValue;
        return tag.getNumberValue();
    }

    getStringOptional(attr: string, defaultValue?: string) {
        const tag = this.getAttr(attr);
        if (!tag || !tag.hasValue())
            return defaultValue;
        return tag.getStringValue();
    }

    getNumber(attr: string): number {
        const tag = this.getAttr(attr);
        if (!tag)
            throw new Error("no value for: " + attr);
        return tag.getNumberValue();
    }

    getAttr(attr: string) {
        return this.tagsByAttr.get(attr);
    }

    getNestedQuery(attr: string) {
        const tag = this.getAttr(attr);
        if (!tag) {
            throw new Error("no value for: " + attr);
        }
        return tag.getQuery();
    }

    getNestedTagList(attr: string) {
        const tag = this.getAttr(attr);
        if (!tag) {
            throw new Error("no value for: " + attr);
        }
        return tag.getTagList();
    }

    tagAtIndex(index: number) {
        return this.tags[index];
    }

    getPositionalAttr(index: number) {
        return this.tags[index]?.attr;
    }

    getCommand() {
        return this.command;
    }

    getPositionalValue(index: number) {
        return this.tags[index].getValue();
    }

    toQueryString() {
        const out = [this.command];

        for (const tag of this.tags) {
            out.push(tag.toQueryString());
        }

        return out.join(' ');
    }

    toItemValue() {
        const item: any = {};
        for (const tag of this.tags) {
            item[tag.attr] = tag.getValue();
        }

        return item;
    }

    withInlinedParams(params: Map<string, any>) {
        const newTags: Tag[] = [];
        let anyChanged = false;

        for (const tag of this.tags) {
            if (tag.isQuery()) {
                const fixedNestedQuery = new Tag(tag.attr, tag.getQuery().withInlinedParams(params))
                newTags.push(fixedNestedQuery);
                anyChanged = true;
                continue;
            }

            if (tag.isTagList()) {
                const fixedNestedTagList = new Tag(tag.attr, tag.getTagList().withInlinedParams(params))
                newTags.push(fixedNestedTagList);
                anyChanged = true;
                continue;
            }

            if (tag.isParameter() && params.has(tag.paramName)) {
                const fixedTag = new Tag(tag.attr, params.get(tag.paramName));
                newTags.push(fixedTag);
                anyChanged = true;
                continue;
            }

            newTags.push(tag);
        }

        if (!anyChanged)
            return this;
        
        const out = new Query(this.command, newTags);
        out.freeze();
        return out;
    }

    dataAsObject() {
        let out: {[key: string]: any} = {};

        for (const tag of this.tags) {
            if (tag.hasValue())
                out[tag.attr] = tag.getValue();
        }

        return out;
    }

    _refresh() {
        this.tagsByAttr = new Map<string, Tag>()
        for (const tag of this.tags)
            if (tag.attr)
                this.tagsByAttr.set(tag.attr, tag);
    }
}


