import { readFileSync } from 'fs';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

const argv = yargs(hideBin(process.argv))
  .option('generate', {
    alias: 'g',
    type: 'array',
    description: 'Generate tracking events',
    })
    .argv;




const generateTrackingEvents = async () => {
    const args = await argv;

    if (!args) {
        return;
    }
    args.generate.forEach(async arg => {
        const folder = arg.slice(0, arg.lastIndexOf('/'));
    });
};    


generateTrackingEvents(argv.generate);

