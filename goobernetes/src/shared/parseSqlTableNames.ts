import { lexStringToIterator } from '@facetlayer/generic-lexer';
import { t_ident, t_space, t_newline, t_line_comment, t_block_comment } from '@facetlayer/generic-lexer';

// SQL keywords that appear immediately before a table name
const TABLE_PRECEDING_KEYWORDS = new Set([
    'from', 'join', 'into', 'update', 'table',
]);

// SQL keywords that are never table names
const SQL_KEYWORDS = new Set([
    'select', 'from', 'where', 'join', 'inner', 'outer', 'left', 'right',
    'cross', 'full', 'on', 'as', 'and', 'or', 'not', 'in', 'is', 'null',
    'like', 'between', 'case', 'when', 'then', 'else', 'end', 'having',
    'group', 'by', 'order', 'limit', 'offset', 'distinct', 'all', 'exists',
    'set', 'values', 'returning', 'with', 'recursive', 'insert', 'delete',
    'create', 'drop', 'alter', 'if', 'replace', 'ignore', 'rollback', 'abort',
    'fail', 'union', 'intersect', 'except',
]);

/**
 * Parses a SQL query and returns the table names referenced in it.
 * Uses @facetlayer/generic-lexer for tokenization.
 *
 * Handles:
 *   SELECT ... FROM tableName
 *   SELECT ... FROM t1 JOIN t2 LEFT JOIN t3
 *   INSERT INTO tableName
 *   INSERT OR IGNORE INTO tableName
 *   UPDATE tableName SET ...
 *   DELETE FROM tableName
 *   CREATE TABLE tableName / CREATE TABLE IF NOT EXISTS tableName
 *   DROP TABLE tableName / DROP TABLE IF EXISTS tableName
 *   ALTER TABLE tableName
 *
 * Returns a list of unique lowercase table names.
 * Returns an empty array if no table names can be determined.
 */
export function parseSqlTableNames(sql: string): string[] {
    const it = lexStringToIterator(sql, {
        cStyleLineComments: true,
        cStyleBlockComments: true,
        bashStyleLineComments: true,
    });

    const tables = new Set<string>();

    function skipWhitespace() {
        while (!it.finished() &&
               (it.nextIs(t_space) || it.nextIs(t_newline) ||
                it.nextIs(t_line_comment) || it.nextIs(t_block_comment))) {
            it.advance();
        }
    }

    function peekIdentLower(): string | null {
        if (it.nextIs(t_ident)) {
            return it.nextText().toLowerCase();
        }
        return null;
    }

    function tryConsumeTableName() {
        skipWhitespace();

        // Handle "IF NOT EXISTS tableName" / "IF EXISTS tableName" (for CREATE/DROP TABLE)
        if (it.nextIs(t_ident) && it.nextText().toLowerCase() === 'if') {
            it.advance(); // consume IF
            skipWhitespace();
            const next = peekIdentLower();
            if (next === 'not') {
                it.advance(); // consume NOT
                skipWhitespace();
            }
            if (peekIdentLower() === 'exists') {
                it.advance(); // consume EXISTS
            }
            skipWhitespace();
        }

        if (!it.finished() && it.nextIs(t_ident)) {
            const name = it.nextText();
            if (!SQL_KEYWORDS.has(name.toLowerCase())) {
                tables.add(name.toLowerCase());
            }
            it.advance();
        }
    }

    while (!it.finished()) {
        skipWhitespace();

        if (it.finished()) break;

        if (it.nextIs(t_ident)) {
            const word = it.nextText().toLowerCase();
            it.advance();

            if (TABLE_PRECEDING_KEYWORDS.has(word)) {
                tryConsumeTableName();
            }
        } else {
            it.advance();
        }
    }

    return Array.from(tables);
}
