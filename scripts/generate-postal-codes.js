const fs = require('fs')
const Path = require('path')

const source = process.argv[2]
if(!source) throw new Error('Usage: node scripts/generate-postal-codes.js <BE.txt>')

const provinceNames = {
    VAN: 'Antwerp', WBR: 'Walloon Brabant', WHT: 'Hainaut', WLG: 'Liège',
    VLI: 'Limburg', WLX: 'Luxembourg', WNA: 'Namur', VOV: 'East Flanders',
    VBR: 'Flemish Brabant', VWV: 'West Flanders', BRU: 'Brussels'
}

const byCode = new Map()
for(const line of fs.readFileSync(source, 'utf8').trim().split('\n')) {
    const columns = line.split('\t')
    const code = Number(columns[1])
    const locality = columns[2]
    const group = columns[6]
    if(!Number.isInteger(code) || !provinceNames[group]) continue
    if(!byCode.has(code)) byCode.set(code, {code, localities: [], group, groupName: provinceNames[group]})
    const entry = byCode.get(code)
    if(!entry.localities.includes(locality)) entry.localities.push(locality)
}

const output = [...byCode.values()].sort((a, b) => a.code - b.code)
for(const entry of output) entry.localities.sort((a, b) => a.localeCompare(b))
fs.writeFileSync(Path.resolve(__dirname, '../server/src/data/belgianPostalCodes.json'), `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${output.length} Belgian postal codes.`)
