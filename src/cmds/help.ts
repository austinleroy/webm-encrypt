const menus: {[key: string]: string} = {
  main: `
  Usage:
    webme --help
    webme --version
    webme <options> -i|--input <input path> -o|--output <output path>

  <options>
    --decrypt, -d ......... decrypt file (encrypt is default)
    --keyfile, -k ......... binary keyfile to use for AES cipher.  Must be 16 bytes.
    --verbose ............. verbose output

  If a keyfile is not provided for encryption, a key will be created and random and stored as <output path>_keyfile.key
  A keyfile MUST be provided for decryption.
    `
}
  
export default () => {
  console.log(menus.main)
}