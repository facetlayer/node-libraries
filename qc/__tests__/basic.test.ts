import { describe, it, expect } from 'vitest'
import { parseQuery, Query, Tag, queryToString } from '../src'

describe('QC - Query Config Parser', () => {
    it('should parse a simple query', () => {
        const query = parseQuery('get foo bar')
        expect(query).toBeInstanceOf(Query)
        expect(query.command).toBe('get')
        expect(query.tags.length).toBe(2)
        expect(query.tags[0].attr).toBe('foo')
        expect(query.tags[1].attr).toBe('bar')
    })

    it('should parse query with values', () => {
        const query = parseQuery('user name="John" age=25')
        expect(query.command).toBe('user')
        expect(query.tags.length).toBe(2)
        expect(query.tags[0].attr).toBe('name')
        expect(query.tags[0].getValue()).toBe('John')
        expect(query.tags[1].attr).toBe('age')
        expect(query.tags[1].getValue()).toBe(25)
    })

    it('should convert query back to string', () => {
        const query = new Query('get', [
            new Tag('user'),
            new Tag('name', 'John Doe') // Use a string with space to test quoting
        ])
        const str = queryToString(query)
        expect(str).toBe('get user name="John Doe"')
    })

    it('should round-trip parse and stringify correctly', () => {
        const originalStr = 'get user name="John" age=25'
        const parsed = parseQuery(originalStr)
        const backToStr = queryToString(parsed)
        const reparsed = parseQuery(backToStr)
        
        // Should have same structure
        expect(reparsed.command).toBe(parsed.command)
        expect(reparsed.tags.length).toBe(parsed.tags.length)
        expect(reparsed.tags[0].getValue()).toBe(parsed.tags[0].getValue())
        expect(reparsed.tags[1].getValue()).toBe(parsed.tags[1].getValue())
    })

    it('should handle nested queries', () => {
        const nestedQuery = new Query('id', [])
        const query = new Query('get', [
            new Tag('user', nestedQuery)
        ])
        expect(query.tags[0].isQuery()).toBe(true)
        expect(query.tags[0].getQuery()).toBeInstanceOf(Query)
    })
})