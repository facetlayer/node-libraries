claude  "$(cat <<'EOF'
1. Ask the user to provide their goals or name ideas for the new domain name.
2. Generate a list of candidate ideas for their domain name. Aim to generate at least 200
   different ideas and write them all to a file candidates.txt .
   - A good domain name is:
     - Not too long (usually less than 16 characters)
     - Catchy, easy to remember and say.
     - Not too many words.
     - If the prompt doesn\'t have specific instructions for which dommain suffixes to use, then by default, 
       generate ideas where 75% of the candidates use .com suffixes, and 25% using alternate suffixes
       like .net, .biz, .io, .co, etc. Alternate suffixes should especially be considered if they
       make sense for the product, or the letters work together with the rest of the name.
3. Write all your candidate domain names to a new file candidates.txt . Don't add comments to the file.
   Each line in the file should have exactly one domain name.
3. Run \`bin/domains-available candidates.txt\` which will check every name to see if it's available.
   This tool will print out domains that are actually available.
4. Finally, write DomainReport.md which includes the top choices that are actually available.

Next up, ask the user for more information!
EOF
)"
