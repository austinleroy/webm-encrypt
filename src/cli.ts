import help from './cmds/help';
import version from './cmds/version';
import encrypt from './cmds/encrypt';
import decrypt from './cmds/decrypt';
import { Arguments } from './arguments';

function argify(args: string[]) {
    let map = new Arguments();
    for(let i=0; i<args.length; i++) {
        if(args[i].startsWith('-')) {                
            switch(args[i]) {
                case '--version': 
                case '-v':
                    map.version = true;
                    break;
                case '--help':
                case '-h':
                    map.help = true;
                    break;
                case '--decrypt':
                case '-d':
                    map.decrypt = true;
                    break;
                case '--keyfile':
                case '-k':
                    map.keyfile = args[++i];
                    break;
                case '--input':
                case '-i':
                    map.input = args[++i];
                    break;
                case '--output':
                case '-o':
                    map.output = args[++i];
                    break;
                case '--verbose': 
                    map.verbose = true;
                    break;

                default:
                    throw `Unknown argument "${args[i]}"!`;
            }
        }
    }

    return map;
}

export = () => {
    let args = argify(process.argv.slice(2));
    let cmd = 'encrypt';
    
    if (args.help || !args.input) {
        cmd = 'help'
    }

    if (args.version) {
        cmd = 'version'
    }

    if(args.decrypt) {
        cmd = 'decrypt'
    }

    switch(cmd) {
        case 'help':
            help();
            break;
        case 'version':
            version();
            break;
        case 'encrypt':
            encrypt(args);
            break;
        case 'decrypt':
            decrypt(args);
            break;
        
        default:
            console.error(`"${cmd}" is not a valid command!`);
            break;
    }
};