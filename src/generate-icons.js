const sharp=require("sharp"),fs=require("fs"),path=require("path"),svgIcon=`
<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="64" cy="64" r="60" fill="#d3513e"/>
<path d="M86 64L54 82.3205L54 45.6795L86 64Z" fill="white"/>
</svg>
`,sizes=[16,32,48,128],outputDir=path.join(__dirname,"icons");fs.existsSync(outputDir)||fs.mkdirSync(outputDir),sizes.forEach(o=>{const e=path.join(outputDir,`icon${o}.png`);sharp(Buffer.from(svgIcon)).resize(o,o).toFile(e,(n,i)=>{n?console.error(`Error generating icon${o}.png:`,n):console.log(`Generated icon${o}.png`)})});
