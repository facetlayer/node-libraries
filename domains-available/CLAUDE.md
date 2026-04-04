This project has a domain availability checker tool at `src/main.ts`.

It accepts domain names as command line arguments, checks each one in parallel,
and prints a summary of which are available and which are taken.

Example:

    $ node src/main.ts example.com asdfjkl4237894.com github.com
    AVAILABLE (1):
      ✓ asdfjkl4237894.com
    TAKEN (2):
      ✗ example.com — has DNS records
      ✗ github.com — has DNS records

The tool checks DNS records, RDAP registration, and does an HTTP probe on
domains that pass other checks to reduce false positives.
