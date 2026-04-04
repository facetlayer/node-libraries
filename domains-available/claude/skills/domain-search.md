# Domain Search

Help the user find available domain names.

## Steps

1. Ask the user about their goals, product name, or ideas for the domain name.
2. Generate at least 200 candidate domain names and collect them into a list.
   - A good domain name is:
     - Not too long (usually less than 16 characters)
     - Catchy, easy to remember and say
     - Not too many words
   - If the user doesn't specify which suffixes to use, generate ideas where 75% use .com
     suffixes and 25% use alternate suffixes like .net, .biz, .io, .co, etc. Alternate
     suffixes should especially be considered if they make sense for the product or the
     letters work together with the rest of the name.
3. Run the domain availability checker, passing the candidate domains as command line arguments.
   The tool is at `domains-available/src/main.ts` relative to the node-libraries root.

   Run it in batches (the tool checks all arguments in parallel):

       node domains-available/src/main.ts domain1.com domain2.com domain3.net ...

   You may need to split into multiple batches if there are many candidates.

4. Collect all the domains that are reported as AVAILABLE across all batches.
5. Write a `DomainReport.md` summarizing the top available choices, organized by quality
   and relevance to the user's goals.

Next up, ask the user for more information!
