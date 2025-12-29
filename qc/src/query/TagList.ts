import { Tag } from './QueryTag.ts'

export class TagList {
    t: 'taglist' = 'taglist'
    tags: Tag[]
    frozen: boolean
    tagsByAttr: Map<string, Tag>

    constructor(tags: Tag[] = []) {
        this.t = 'taglist'
        this.tags = tags;
        this.tagsByAttr = new Map();
        this.rebuildTagsByAttr();
    }

    freeze() {
        if (this.frozen)
            return;
        this.frozen = true;
        for (const tag of this.tags) {
            tag.freeze();
        }
        Object.freeze(this);
    }

    rebuildTagsByAttr() {
        this.tagsByAttr.clear();
        for (const tag of this.tags) {
            this.tagsByAttr.set(tag.attr, tag);
        }
    }

    getAttr(attr: string): Tag | null {
        const out = this.tagsByAttr.get(attr);
        return out || null;
    }

    hasAttr(attr: string): boolean {
        return this.tagsByAttr.has(attr);
    }

    getStringValue(attr: string): string {
        const tag = this.getAttr(attr);
        if (!tag)
            throw new Error("no value for: " + attr);
        return tag.getStringValue();
    }

    toQueryString(): string {
        return this.tags.map(tag => tag.toQueryString()).join(' ');
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
            if (tag.isTagList()) {
                const fixedNestedTagList = new Tag(tag.attr, tag.getTagList().withInlinedParams(params))
                newTags.push(fixedNestedTagList);
                anyChanged = true;
                continue;
            }

            if (tag.isQuery()) {
                const fixedNestedQuery = new Tag(tag.attr, tag.getQuery().withInlinedParams(params))
                newTags.push(fixedNestedQuery);
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
        
        const out = new TagList(newTags);
        out.freeze();
        return out;
    }
}