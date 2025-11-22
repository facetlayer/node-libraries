
import type { Query, QueryNode } from '../query'
import type { TagList } from './TagList'

export type TagValue = string | number | boolean | Query | QueryNode | TagList | TagStarValue;

export enum TagSpecialValueType {
    star = 1200
}

export interface TagStarValue {
    t: TagSpecialValueType.star
}

export class Tag {
    t: 'tag' = 'tag'
    attr: string = ''
    value: TagValue = undefined
    isValueOptional: boolean = false
    isAttrOptional: boolean = false
    paramName: string | undefined = undefined
    frozen: boolean = false

    constructor(attr?: string, value?: TagValue) {
        this.t = 'tag'
        if (attr)
            this.attr = attr;

        if (value != null)
            this.value = value || null
    }

    freeze() {
        if (this.frozen)
            return;
        this.frozen = true;
        Object.freeze(this);
    }

    hasValue() {
        return this.value != null;
    }

    hasStringValue() {
        return typeof this.value === 'string';
    }

    isParameter() {
        return this.paramName != null;
    }

    isQuery() {
        return (this.value as any)?.t === 'query';
    }

    isStar() {
        return (this.value as any)?.t === TagSpecialValueType.star;
    }

    getQuery() {
        if (!this.isQuery()) {
            throw new Error("Tag value is not a query");
        }

        return this.value as Query;
    }

    isTagList() {
        return (this.value as any)?.t === 'taglist';
    }

    getTagList() {
        if (!this.isTagList()) {
            throw new Error("Tag value is not a taglist");
        }

        return this.value as TagList;
    }

    getTaggedValue() {
        return this.value;
    }

    getValue() {
        if (this.value == null)
            return this.value;

        if ((this.value as any)?.t === TagSpecialValueType.star)
            throw new Error(".getValue usage error: tag has special value (star)");

        return this.value;
    }

    getStringValue(): string {
        if (this.value == null)
            throw new Error(`Tag '${this.attr}' has no value`);

        if (typeof this.value === 'string')
            return this.value;

        if (typeof this.value === 'number')
            return this.value.toString();

        throw new Error(`Tag '${this.attr}' value is not a string (${typeof this.value})`);
    }

    getNumberValue(): number {
        if (this.value == null)
            throw new Error(`Tag '${this.attr}' has no value`);

        if (typeof this.value === 'string')
            return parseFloat(this.value);

        if (typeof this.value === 'number')
            return this.value;

        throw new Error(`Tag '${this.attr}' value is not a number (${typeof this.value})`);
    }

    private needsQuoting(str: string): boolean {
        // Quote if string contains spaces or starts with special characters
        return /[\s"']/.test(str);
    }
    
    toQueryString() {
        if (this.attr === '*')
            return '*';

        let out = '';

        if (this.isParameter() && this.paramName === this.attr)
            out += '$';

        out += this.attr;

        if (this.isAttrOptional)
            out += '?';

        if (this.isParameter() && this.paramName !== this.attr)
            out += `=$${this.paramName}`;

        else if (this.hasValue()) {
            if (this.isQuery()) {
                out += `(${(this.value as Query).toQueryString()})`;
            } else if (this.isTagList()) {
                out += `(${(this.value as TagList).toQueryString()})`;
            } else {
                out += `=`;

                if (this.isStar()) {
                    out += '*';
                } else {
                    const value = this.getValue();
                    if (typeof value === 'string') {
                        // Only quote strings that need quoting (contain spaces or special chars)
                        if (this.needsQuoting(value)) {
                            out += `"${value}"`;
                        } else {
                            out += value;
                        }
                    } else {
                        out += '' + value;
                    }
                }
            }
        }

        return out;
    }

    toOriginalString(): string {
        if (this.isTagList()) {
            const tagList = this.getTagList();
            return tagList.toQueryString();
        }
        return this.toQueryString();
    }
}
