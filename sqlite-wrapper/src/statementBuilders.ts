
function assertSqlIdentifier(s: string) {
    // Throw an error if the string is not a valid SQL identifier. Guards against (some kinds of)
    // SQL injection.

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) {
        throw new Error(`invalid SQL identifier: "${s}"`);
    }
}

export function prepareSelectStatement(tableName: string, selectedRows: string[], where: Record<string,any>) {
    let whereParams = [];
    let whereValues = [];

    assertSqlIdentifier(tableName);

    for (const columnName of selectedRows) {
        assertSqlIdentifier(columnName);
    }

    for (const [ whereColumn, whereValue ] of Object.entries(where)) {
        assertSqlIdentifier(whereColumn);

        whereParams.push(`${whereColumn} = ?`);
        whereValues.push(whereValue);
    }

    const sql = `SELECT ${selectedRows.join(', ')} FROM ${tableName} WHERE ${whereParams.join(' and ')}`;
    return {
        sql,
        values: whereValues
    }
}

export function prepareInsertStatement(tableName: string, row: Record<string,any>) {
    let columns = [];
    let valuePlaceholders = [];
    let values = [];

    assertSqlIdentifier(tableName);

    for (const [ name, value ] of Object.entries(row)) {
        assertSqlIdentifier(name);

        columns.push(name);
        valuePlaceholders.push('?');
        values.push(value);
    }

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${valuePlaceholders.join(', ')})`;

    return {
        sql,
        values
    }
}

export function prepareUpdateStatement(tableName: string, where: Record<string,any>, row: Record<string,any>) {
    let whereParams = [];
    let whereValues = [];
    let setParams = [];
    let setValues = [];

    assertSqlIdentifier(tableName);

    for (const [ whereColumn, whereValue ] of Object.entries(where)) {
        assertSqlIdentifier(whereColumn);

        whereParams.push(`${whereColumn} = ?`);
        whereValues.push(whereValue);
    }

    for (const [ name, value ] of Object.entries(row)) {
        assertSqlIdentifier(name);

        setParams.push(`${name} = ?`);
        setValues.push(value);
    }

    let sql = `UPDATE ${tableName} SET ${setParams.join(', ')}`;
    if (whereParams.length > 0) {
        sql += ` WHERE ${whereParams.join(' AND ')}`;
    }

    return {
        sql,
        values: setValues.concat(whereValues)
    }
}

