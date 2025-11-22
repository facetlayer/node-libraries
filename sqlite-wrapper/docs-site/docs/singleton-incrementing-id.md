# SingletonIncrementingId

The `SingletonIncrementingId` class provides an auto-incrementing ID generator backed by a database table. Useful for generating sequential identifiers like invoice numbers, order IDs, or any sequence that needs to persist across restarts.

## Usage

```typescript
const invoiceIds = db.incrementingId('invoice_counter');
```

## Constructor Options

```typescript
interface IncrementingIdOptions {
    initialValue?: number;  // Default: 1
}
```

## Methods

### `take()`

Returns the next ID in the sequence and increments the counter.

```typescript
const id1 = invoiceIds.take(); // Returns: 1
const id2 = invoiceIds.take(); // Returns: 2
const id3 = invoiceIds.take(); // Returns: 3
```

## Example

### Schema

```typescript
const schema: DatabaseSchema = {
    name: 'OrderDatabase',
    statements: [
        `create table order_counter(value integer)`,
        `create table orders(
            id integer primary key,
            order_number text unique,
            customer_name text,
            total decimal
        )`
    ]
};
```

### Usage

```typescript
import { DatabaseLoader } from '@facetlayer/sqlite-wrapper';

const db = loader.load();

// Start order numbers at 10000
const orderNumbers = db.incrementingId('order_counter', { initialValue: 10000 });

function createOrder(customerName: string, total: number) {
    const orderNumber = `ORD-${orderNumbers.take()}`;

    db.insert('orders', {
        order_number: orderNumber,
        customer_name: customerName,
        total
    });

    return orderNumber;
}

const order1 = createOrder('Alice', 99.99);  // 'ORD-10000'
const order2 = createOrder('Bob', 149.99);   // 'ORD-10001'
const order3 = createOrder('Carol', 79.99);  // 'ORD-10002'
```

## How It Works

1. On first call to `take()`:
   - Checks if the counter table has a row
   - If empty, inserts `initialValue + 1` and returns `initialValue`

2. On subsequent calls:
   - Reads the current value
   - Increments the stored value by 1
   - Returns the previous value

## Thread Safety

Since `better-sqlite3` operations are synchronous and SQLite handles locking, `take()` is safe to call from multiple parts of your application. Each call is atomic.

## When to Use

Use `SingletonIncrementingId` when you need:

- Sequential invoice or order numbers
- Ticket IDs that must be unique and sequential
- Any persistent counter that survives restarts
- Human-readable sequential identifiers

For simple auto-incrementing primary keys, use SQLite's built-in `integer primary key` which auto-increments automatically.
