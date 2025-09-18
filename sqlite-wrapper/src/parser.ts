
import { lexifyString, TokenIterator,
    t_lparen, t_rparen, t_comma, t_semicolon, t_dot } from '@facetlayer/generic-lexer'

export interface CreateTableColumn {
    name: string
    definition: string
}

export interface CreateTable {
    t: 'create_table'
    name: string
    columns: CreateTableColumn[]
    references: string[]
    uniqueConstraints: string[]
}

export interface CreateIndex {
    t: 'create_index'
    index_name: string
    references?: string[]
    uniqueConstraints?: string[]
}

export interface InsertItem {
    t: 'insert_item'
    table_name: string
    columns: string[]
    values: string[]
}

export interface PragmaStatement {
    t: 'pragma'
    pragma_name: string
    value?: string
}

export type SqlStatement = CreateTable | CreateIndex | InsertItem | PragmaStatement

function createTable(it: TokenIterator): SqlStatement {
    it.consume(); // create
    it.consume(); // table

    const name = it.consumeAsText();
    const out: SqlStatement = {
        t: 'create_table',
        name,
        columns: [],
        references: [],
        uniqueConstraints: [],
    }

    it.consume(t_lparen);

    while (!it.finished()) {
        // Each column definition
        if (it.tryConsume(t_rparen))
            break;

        it.tryConsume(t_comma);

        if (it.nextText().toLowerCase() === 'foreign' && it.nextText(1).toLowerCase() === 'key') {
            const tokens = [];
            let parenDepth = 0;

            it.consume();
            it.consume();

            while (!it.finished()) {
                if (it.nextIs(t_lparen))
                    parenDepth--;
                if (it.nextIs(t_rparen))
                    parenDepth++;

                if (parenDepth === 0 && it.nextIs(t_comma))
                    break;
                if (parenDepth >= 1)
                    break;

                tokens.push(it.consumeAsText());
            }

            out.references.push(tokens.join(' '));
            continue;
        }

        if (it.nextText().toLowerCase() === 'unique') {
            it.consume();
            const tokens = [];

            let parenDepth = 0;
            while (!it.finished()) {
                if (it.nextIs(t_lparen))
                    parenDepth--;
                if (it.nextIs(t_rparen))
                    parenDepth++;

                if (parenDepth >= 1)
                    break;

                tokens.push(it.consumeAsText());
            }

            out.uniqueConstraints.push(tokens.join(' '));
            continue;
        }

        const name = it.consumeAsText();

        let tokens: string[] = []
        let parenDepth = 0;

        while (!it.finished()) {
            // Check if we're at the end of the table definition
            if (it.nextIs(t_rparen) && parenDepth === 0)
                break;
            
            // Check if we're at the end of this column definition (comma at depth 0)
            if (it.nextIs(t_comma) && parenDepth === 0) {
                it.consume(t_comma);
                break;
            }

            // Update parentheses depth
            if (it.nextIs(t_lparen))
                parenDepth++;
            if (it.nextIs(t_rparen))
                parenDepth--;

            tokens.push(it.consumeAsText());
        }

        out.columns.push({
            name,
            definition: tokens.join(' '),
        });
    }

    return out;
}

function createIndex(it: TokenIterator): SqlStatement {
    it.consume();

    if (it.nextText().toLowerCase() === 'unique')
        it.consume();

    if (it.nextText().toLowerCase() !== 'index')
        throw new Error("parse error, expected 'index'");
    it.consume();

    if (it.nextText().toLowerCase() === 'if'
            && it.nextText(1).toLowerCase() === 'not'
            && it.nextText(2).toLowerCase() === 'exists') {
        it.consume();
        it.consume();
        it.consume();
    }

    let index_name = it.consumeAsText();

    if (it.nextIs(t_dot)) {
        // Statement looks like: create index schema_name.index_name
        it.consume(t_dot);
        index_name = it.consumeAsText();
    }

    return {
        t: 'create_index',
        index_name,
    }
}

function insertItem(it: TokenIterator): SqlStatement {
    it.consume();
    it.consume();

    const table_name = it.consumeAsText();

    const columns = [];
    it.consume(t_lparen);

    while (!it.finished() && !it.tryConsume(t_rparen)) {
        columns.push(it.consumeAsText());
        it.tryConsume(t_comma);
    }

    if (it.consumeAsText().toLowerCase() !== 'values')
        throw new Error("expected keyword: values, saw: " + it.nextText(-1));

    const values = [];
    it.consume(t_lparen);
    while (!it.finished() && !it.tryConsume(t_rparen)) {
        values.push(it.consumeAsText());
        it.tryConsume(t_comma);
    }

    it.tryConsume(t_semicolon);

    return {
        t: 'insert_item',
        table_name,
        columns,
        values,
    }
}

function pragmaStatement(it: TokenIterator): SqlStatement {
    it.consume(); // pragma
    
    const pragma_name = it.consumeAsText();
    
    let value;
    if (!it.finished() && !it.nextIs(t_semicolon)) {
        if (it.nextText() === '=') {
            it.consume(); // =
            value = it.consumeAsText();
        } else {
            // Handle function call syntax like table_info(users) or simple values
            const tokens = [];
            let parenDepth = 0;
            
            while (!it.finished() && !it.nextIs(t_semicolon)) {
                if (it.nextIs(t_lparen)) {
                    parenDepth++;
                }
                if (it.nextIs(t_rparen)) {
                    parenDepth--;
                }
                
                tokens.push(it.consumeAsText());
                
                if (parenDepth === 0) {
                    break;
                }
            }
            
            if (tokens.length > 0) {
                value = tokens.join('');
            }
        }
    }
    
    it.tryConsume(t_semicolon);
    
    return {
        t: 'pragma',
        pragma_name,
        value,
    }
}

function tokenizeSql(sql: string) {
    const tokens = lexifyString(sql, { autoSkipSpaces: true, autoSkipNewlines: true });
    const it = new TokenIterator(tokens);
    return it;
}

export function parseSql(sql: string) {

    const it = tokenizeSql(sql);

    if (it.nextText(0).toLowerCase() === 'create' && it.nextText(1).toLowerCase() === 'table') {
        const statement = createTable(it);
        return statement;
    }

    if (it.nextText(0).toLowerCase() === 'create' &&
        ((it.nextText(1).toLowerCase() === 'index')
        || 
        (it.nextText(1).toLowerCase() === 'unique' && it.nextText(2).toLowerCase() === 'index'))
    ) {
        const statement = createIndex(it);
        return statement;
    }

    if (it.nextText(0).toLowerCase() === 'insert' && it.nextText(1).toLowerCase() === 'into') {
        const statement = insertItem(it);
        return statement;
    }

    if (it.nextText(0).toLowerCase() === 'pragma') {
        const statement = pragmaStatement(it);
        return statement;
    }

    throw new Error(`unrecognized statement ${it.nextText(0)} ${it.nextText(1)}`);
}

export function parsedStatementToString(statement: SqlStatement) {
    switch (statement.t) {
    case 'create_table': {
        statement = statement as CreateTable;
        let columnDefs = [];

        for (const column of statement.columns) {
            columnDefs.push(`${column.name} ${column.definition}`);
        }

        let result = `create table ${statement.name} (${columnDefs.join(', ')});`;

        return result;
    }
        break;
    default:
        throw new Error("not supported: backToString on statement type: " + statement.t);
    }
}

export function createTableWithReplacedTableName(sql: string, newTableName: string) {
    const it = tokenizeSql(sql);

    it.consume(); // create
    it.consume(); // table
    it.consumeAsText(); // the table name

    return `create table ${newTableName} ${it.sourceText.getTextRange(it.getPosition(), it.sourceText.getLastTokenIndex())}`
}
