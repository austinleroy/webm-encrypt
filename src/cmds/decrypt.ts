import { Arguments } from "../arguments";
import fs from 'fs';
import { WebmStreamEncryptor, EncryptMode } from "../WebmStreamEncryptor";
import { pipeline } from "stream";

export default (args: Arguments) => {
    if(!args.input) {
        console.error(`No value found for required parameter "input"!`);
        return;
    }
    if(!args.output) {
        console.error(`No value found for required parameter "output"!`);
        return;
    }
    if(args.input === args.output) {
        console.error(`Input and output paths cannot be the same!`);
        return;
    }
    if(!args.keyfile) {
        console.error(`Keyfile must be provided for decryption.`);
        return;
    } 

    if(args.verbose) {
        console.log(`Decrypting file '${args.input}'. Output will be stored at '${args.output}'.`);
        console.log(`Reading decryption key from '${args.keyfile}'.`);
    }

    
    let key: Uint8Array = new Uint8Array(16);
    let fileContents: Buffer = fs.readFileSync(args.keyfile);
    let copiedBytes = fileContents.copy(key);
    if(copiedBytes !== 16) {
        console.error(`Keyfile must be 16 bytes! Length was {${copiedBytes}}`);
        return;
    }

    let encryptTransform = new WebmStreamEncryptor(EncryptMode.Decrypt, key);

    if(args.verbose) {
        console.log(`Decrypting file with key <${key.reduce((p,c) => p + (c < 16 ? '0' : '') + c.toString(16), '')}>`);
    }
    
    pipeline(
        fs.createReadStream(args.input),
        encryptTransform,
        fs.createWriteStream(args.output),
        (err) => {
            if(err) {
                throw err;
            }
            if(args.verbose) {
                console.log('Finished!');
            }
        }
    );
}