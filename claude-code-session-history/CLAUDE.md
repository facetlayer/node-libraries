# claude-code-session-history

## Running the CLI during development

Run the CLI directly from source:

```bash
./src/cli.ts list-projects
./src/cli.ts list-sessions --project <project-name>
./src/cli.ts get-chat --session <session-id>
```

## Schema Validation

This library implements a Zod schema which attempts to capture the data shape
of Claude Code .jsonl files. Since CC is constantly updating, then it's possible
that our schema can be out of date.

The tool has a command to check our schema:

./src/cli.ts check-schema

This will look at every found file and validate it with our schema, and print
errors.

If there are schema errors then the usual next step is to update our schema to
capture the new data shape.
