import { readFileSync } from 'fs'
import solgraph from 'solgraph'

const dot = solgraph(fs.readFileSync('../../contracts/FiatToken.sol'))
console.log(dot)