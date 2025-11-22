# @facetlayer/concurrency-limit

Limit the number of concurrent async operations with a simple queue-based limiter. Useful when you need to make many parallel async calls but want to cap how many run at once.

## Install

```
yarn add @facetlayer/concurrency-limit
# or
npm i @facetlayer/concurrency-limit
```

## Quick Start

Using `forEachWithConcurrentLimit` (simplest approach):

```ts
import { forEachWithConcurrentLimit } from '@facetlayer/concurrency-limit'

const urls = ['url1', 'url2', 'url3', 'url4', 'url5']

// Process all URLs with max 2 concurrent requests
await forEachWithConcurrentLimit(urls, { maxConcurrent: 2 }, async (url) => {
  const response = await fetch(url)
  console.log(`Fetched ${url}`)
})
```

Using `Limiter` for more control:

```ts
import { Limiter } from '@facetlayer/concurrency-limit'

const limiter = new Limiter({ maxConcurrent: 3 })

// Queue up tasks - they'll run with at most 3 concurrent
for (const item of items) {
  await limiter.start(async () => {
    await processItem(item)
  })
}

// Wait for all tasks to complete
await limiter.allSettled()
```

## API

### `Limiter`

A class that manages concurrent execution of async tasks.

#### Constructor

```ts
new Limiter(options: Options)
```

```ts
interface Options {
  maxConcurrent: number  // Maximum number of tasks that can run at once (must be > 0)
}
```

#### Methods

##### `start(fn: () => Promise<void>): Promise<void>`

Start a task. Returns a promise that resolves when the task **starts** (not when it finishes).

When calling `start()`, you should `await` it to respect the concurrency limit - this prevents you from queuing more tasks than the limit allows. If the limiter is at capacity, `start()` will wait until a slot becomes available.

```ts
const limiter = new Limiter({ maxConcurrent: 2 })

// Queue tasks - await ensures we respect the limit
for (const url of urls) {
  await limiter.start(async () => {
    await fetch(url)
  })
}

await limiter.allSettled()
```

##### `allSettled(): Promise<void>`

Returns a promise that resolves when all currently running tasks have finished.

```ts
await limiter.allSettled()
console.log('All tasks complete!')
```

#### Properties

- `activeTaskCount: number` - The number of currently running tasks

### `forEachWithConcurrentLimit<T>(items, options, callback)`

A convenience function that iterates over an array with concurrency limiting. Similar to `items.forEach()` but limits concurrent executions.

```ts
async function forEachWithConcurrentLimit<T>(
  items: T[],
  options: Options,
  callback: (item: T) => Promise<void>
): Promise<void>
```

This function:
1. Creates a `Limiter` with the given options
2. Calls the callback for each item, respecting the concurrency limit
3. Waits for all callbacks to complete before returning

```ts
import { forEachWithConcurrentLimit } from '@facetlayer/concurrency-limit'

const files = ['file1.txt', 'file2.txt', 'file3.txt']

await forEachWithConcurrentLimit(files, { maxConcurrent: 2 }, async (file) => {
  await uploadFile(file)
})

console.log('All files uploaded!')
```

## Example: Batch API Requests

```ts
import { Limiter } from '@facetlayer/concurrency-limit'

async function fetchAllUsers(userIds: string[]) {
  const limiter = new Limiter({ maxConcurrent: 5 })
  const results: User[] = []

  for (const id of userIds) {
    await limiter.start(async () => {
      const user = await fetchUser(id)
      results.push(user)
    })
  }

  await limiter.allSettled()
  return results
}
```

## Example: File Processing Pipeline

```ts
import { forEachWithConcurrentLimit } from '@facetlayer/concurrency-limit'

const files = await glob('**/*.jpg')

await forEachWithConcurrentLimit(files, { maxConcurrent: 4 }, async (file) => {
  await resizeImage(file)
  await uploadToS3(file)
  console.log(`Processed ${file}`)
})
```

## Development

```
pnpm build   # compile TypeScript to dist/
pnpm test    # run unit tests (vitest)
```
