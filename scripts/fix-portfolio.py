import re
with open('src/portfolio.js','r') as f: c=f.read()
M={'GV-003':('B2B2C','SMB'),'GV-004':('B2B','Enterprise'),'GV-005':('B2B','SMB/Enterprise'),'GV-006':('B2B','Enterprise'),'GV-007':('B2B','SMB/Enterprise'),'GV-008':('B2B','SMB'),'GV-009':('B2C','Consumer'),'GV-010':('B2B2C','SMB/Enterprise'),'GV-011':('B2B2C','SMB'),'GV-012':('B2C','Consumer'),'GV-013':('B2C','Consumer'),'GV-014':('B2B/B2G','SMB'),'GV-015':('B2B','Enterprise'),'GV-016':('B2B','Enterprise'),'GV-017':('B2C','Consumer'),'GV-018':('B2B','Enterprise'),'GV-019':('B2B','Enterprise'),'GV-021':('B2B','SMB'),'GV-022':('B2B','SMB'),'GV-023':('B2C','Consumer'),'GV-024':('B2B','SMB'),'GV-025':('B2C','Consumer'),'GV-026':('B2C','Consumer'),'GV-027':('B2C','Consumer'),'GV-028':('B2B','SMB'),'GV-029':('B2C','Consumer'),'GV-030':('B2B','SMB'),'GV-031':('B2B','SMB'),'GV-032':('B2B2C','SMB'),'GV-033':('B2C','Consumer'),'GV-034':('B2B','Enterprise'),'GV-035':('B2C','Consumer'),'GV-036':('B2B','SMB'),'GV-037':('B2B','Enterprise'),'GV-038':('B2B','Enterprise'),'GV-039':('B2B','SMB'),'GV-040':('B2C','Consumer'),'GV-041':('B2B','SMB'),'GV-042':('B2B','SMB'),'GV-043':('B2B','SMB'),'GV-044':('B2B','SMB'),'GV-045':('B2C','Consumer'),'GV-046':('B2B','SMB'),'GV-047':('B2B','Enterprise'),'GV-048':('B2B','SMB'),'GV-049':('B2C','Consumer'),'GV-050':('B2B','SMB'),'GV-051':('B2B','Enterprise'),'GV-052':('B2B','SMB/Enterprise'),'GV-053':('B2B','SMB'),'GV-054':('B2G','Government'),'GV-055':('B2B','Enterprise'),'GV-056':('B2B2C','SMB'),'GV-057':('B2C','Consumer'),'GV-058':('B2C','Consumer'),'GV-059':('B2B','Enterprise'),'GV-060':('B2B','SMB/Enterprise'),'GV-064':('B2B','SMB'),'GV-065':('B2B','SMB/Enterprise'),'GV-067':('B2B','Enterprise'),'GV-068':('B2B','Enterprise'),'GV-069':('B2B2C','SMB'),'GV-070':('B2B2C','SMB'),'GV-071':('B2C','Consumer')}
n=0
for gid,(tm,ts) in M.items():
    pat=r'("id":"'+gid+'"[^}]*?)("recruitUrl")'
    if re.search(pat,c):
        c=re.sub(pat,r'\1"target_market":"'+tm+'","target_segment":"'+ts+'",\2',c,count=1)
        n+=1
with open('src/portfolio.js','w') as f: f.write(c)
print(f'Done: {n} companies updated')
