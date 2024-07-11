watch -t 'cloc src/ dev --yaml --quiet | awk "NR==16 { print $1}"'
watch -t 'cloc src/ dev --yaml --quiet | awk "NR==15, NR==16 { print $1}"' 
watch -t 'cloc src/ dev --yaml --quiet | awk "NR==15 { print $1}"' 
watch -t 'rg TODO src -c | awk -F : \'BEGIN{s=0}{s+=$2}END{print s}\''
