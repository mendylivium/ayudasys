import fs from 'node:fs';
const lines=[
 [145,235,'ALING MILA: Ana, paano po kami makakakuha?'],
 [244,356,'ANA: Irehistro muna natin ang pamilya ninyo.'],
 [360,476,'ANA: Saka susuriin ang kwalipikasyon sa programa.'],
 [490,590,'ANA: Dito nakatala ang inyong pamilya.'],
 [605,713,'ANA: Ito ang QR stub ninyo. Ingatan po.'],
 [730,850,'STAFF: Nakita na ang tala. Patingin po ng ID.'],
 [870,953,'STAFF: Tugma na. Kukumpirmahin ko ang release.'],
 [968,1075,'STAFF: Naitala na po ang pagtanggap ninyo.'],
 [1090,1193,'ANA: Makikita rin ang release sa dashboard.'],
 [1208,1285,'ALING MILA: Salamat, Ana. Malinaw ang bawat hakbang.'],
 [1290,1375,'ANA: At may tala ang bawat tulong.'],
];
const time=f=>new Date(Math.round(f/30*1000)).toISOString().slice(11,23).replace('.',',');
fs.mkdirSync('out',{recursive:true});
fs.writeFileSync('out/ayudasys-tagalog.srt',lines.map(([a,b,t],i)=>`${i+1}\n${time(a)} --> ${time(b)}\n${t}\n`).join('\n'));
fs.copyFileSync('out/stills/f1490.jpeg','out/poster.jpeg');
