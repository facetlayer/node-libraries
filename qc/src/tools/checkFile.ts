import * as fs from 'fs'
import { parseFile } from '../parser'
import { queryToString, Query, Tag, TagList } from '../query'

function printTag(tag: Tag, indent: string): void {
    console.log(`${indent}- ${tag.attr}`)
    
    if (tag.isParameter()) {
        console.log(`${indent}  parameter: ${tag.paramName}`)
    }
    
    if (tag.hasValue()) {
        if (tag.isQuery()) {
            const nestedQuery = tag.getQuery()
            console.log(`${indent}  nested query:`)
            console.log(`${indent}    command: ${nestedQuery.command}`)
            if (nestedQuery.tags.length > 0) {
                console.log(`${indent}    tags:`)
                nestedQuery.tags.forEach(nestedTag => {
                    printTag(nestedTag, indent + '      ')
                })
            }
        } else if (tag.isTagList()) {
            const tagList = tag.getTagList()
            console.log(`${indent}  tag list:`)
            tagList.tags.forEach(nestedTag => {
                printTag(nestedTag, indent + '    ')
            })
        } else {
            const value = tag.getValue()
            console.log(`${indent}  value: ${JSON.stringify(value)}`)
        }
    }
}

function printQuery(query: Query, index: number, totalQueries: number): void {
    console.log(`"${queryToString(query)}"`)
    console.log(`command: ${query.command}`)
    
    if (query.tags.length > 0) {
        console.log('tags:')
        query.tags.forEach(tag => {
            printTag(tag, '  ')
        })
    }
    
    if (index < totalQueries - 1) {
        console.log('')
    }
}

export function checkFile(filename: string): void {
    try {
        // Check if file exists
        if (!fs.existsSync(filename)) {
            console.error(`Error: File '${filename}' not found`)
            process.exitCode = 1
            return
        }

        // Read file content
        const content = fs.readFileSync(filename, 'utf-8')
        
        // Parse the file
        const queries = parseFile(content)
        
        queries.forEach((query: Query, index) => {
            printQuery(query, index, queries.length)
        })
        
        if (queries.length === 0) {
            console.log('No queries found in file (empty or only comments)')
        }
        
    } catch (error) {
        console.error(`Error parsing file '${filename}':`)
        console.error(error.message)
        process.exitCode = 1
    }
}

export function main(): void {
    const args = process.argv.slice(2)
    
    if (args.length === 0) {
        console.error('Usage: qc-check-file <filename>')
        console.error('  Parse a query config file and display its structure')
        process.exitCode = 1
        return
    }
    
    if (args.length > 1) {
        console.error('Error: Too many arguments')
        console.error('Usage: qc-check-file <filename>')
        process.exitCode = 1
        return
    }
    
    const filename = args[0]
    checkFile(filename)
}
