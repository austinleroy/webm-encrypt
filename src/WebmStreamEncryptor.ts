import { Transform, TransformOptions, TransformCallback, PassThrough, Readable, pipeline } from "stream";
import crypto from "crypto";
import { EbmlStreamDecoder, EbmlTag, EbmlTagId, EbmlMasterTag, EbmlDataTag, SimpleBlock, EbmlTagFactory, EbmlStreamEncoder } from 'ebml-stream';

export enum EncryptMode {
    Encrypt = 'encrypt',
    Decrypt = 'decrypt'
}

export class WebmStreamEncryptor extends PassThrough {

    private _transformPipeline: Transform;

    constructor(
        mode: EncryptMode,
        key: Uint8Array,
        options?: TransformOptions
    ) {
        super({ ...options });

        if(mode === undefined) {
            throw `WebmStreamEncryptor must be instantiated with a valid mode! ('encrypt' or 'decrypt')`;
        }

        if(key === undefined || key.length !== 16) {
            throw 'WebmStreamEncryptor must be instantiated with a 128-bit key!';
        }

        let decoder: EbmlStreamDecoder;
        if(mode === EncryptMode.Decrypt) {
            decoder = new EbmlStreamDecoder({
                bufferTagIds: [
                    EbmlTagId.ContentEncodings
                ]
            });
        } else {
            decoder = new EbmlStreamDecoder({
                bufferTagIds: [
                    EbmlTagId.TrackEntry
                ]
            });
        }

        this._transformPipeline = pipeline(
            decoder,
            new WebmTagEncryptor(mode, key, options),
            new EbmlStreamEncoder()
        );

        this.on('pipe', (source: Readable) => {
            source.unpipe(this);
            source.pipe(decoder);
        });
    }

    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T {
        return this._transformPipeline.pipe(destination, options);
    }
}

class WebmTagEncryptor extends Transform {
    private _keyBuffer: Buffer;
    private _trackIvMap: {[key: number]: Uint32Array } = {};

    constructor(
        private _mode: EncryptMode,
        key: Uint8Array,
        options?: TransformOptions
    ) {
        super({ ...options, readableObjectMode: true, writableObjectMode: true });

        this._keyBuffer = Buffer.from(key.buffer);
    }

    //@ts-ignore
    _transform(chunk: EbmlTag | undefined, encoding: string, callback: TransformCallback): void {
        if(chunk) {
            if(this._mode === EncryptMode.Encrypt) {
                chunk = this.encryptChunk(chunk);
            } else {
                chunk = this.decryptChunk(chunk);
            }
        }
        callback(undefined, chunk);
    }

    private decryptChunk(chunk: EbmlTag | undefined): EbmlTag | undefined {
        if(chunk && chunk.id === EbmlTagId.SimpleBlock && (<SimpleBlock>chunk).payload[0] === 0x01) {
            this.decryptBlockData(<SimpleBlock>chunk);
        }

        if(chunk && chunk.id === EbmlTagId.ContentEncodings) {
            (<EbmlMasterTag>chunk).Children = (<EbmlMasterTag>chunk).Children.filter((contentEncoding: EbmlTag) => {
                let encodingType = <EbmlDataTag>(<EbmlMasterTag>contentEncoding).Children.find((t: EbmlTag) => t.id === EbmlTagId.ContentEncodingType);
                return encodingType && encodingType.data !== 1;
            });
            
            if((<EbmlMasterTag>chunk).Children.length === 0) {
                chunk = undefined;
            }
        }

        return chunk;
    }

    private encryptChunk(chunk: EbmlTag): EbmlTag {
        if(chunk.id === EbmlTagId.SimpleBlock) {
            this.encryptBlockData(<SimpleBlock>chunk);
        }

        if(chunk.id === EbmlTagId.TrackEntry) {
            let contentEncodings = <EbmlMasterTag>(<EbmlMasterTag>chunk).Children.find((t: EbmlTag) => t.id === EbmlTagId.ContentEncodings);
            if(!contentEncodings) {
                contentEncodings = EbmlTagFactory.create(EbmlTagId.ContentEncodings);
                (<EbmlMasterTag>chunk).Children.push(contentEncodings);
            }
            contentEncodings.Children.push(this.getEncryptionContentEncodingTag());
        }

        return chunk;
    }

    private decryptBlockData(simpleBlock: SimpleBlock): void {
        let iv = Buffer.alloc(16);
        simpleBlock.payload.slice(1,9).copy(iv);
        let cipher = crypto.createDecipheriv('AES-128-CTR', this._keyBuffer, iv);
        simpleBlock.payload = Buffer.concat([
            cipher.update(simpleBlock.payload.slice(9)),
            cipher.final()
        ]);
    }

    private getEncryptionContentEncodingTag(): EbmlTag {
        let encoding = EbmlTagFactory.create(EbmlTagId.ContentEncoding);

        let encodingOrder = EbmlTagFactory.create(EbmlTagId.ContentEncodingOrder);
        encodingOrder.data = 0;
        encoding.Children.push(encodingOrder);

        let encodingScope = EbmlTagFactory.create(EbmlTagId.ContentEncodingScope);
        encodingScope.data = 1;
        encoding.Children.push(encodingScope);

        let encodingType = EbmlTagFactory.create(EbmlTagId.ContentEncodingType);
        encodingType.data = 1;
        encoding.Children.push(encodingType);
        
        let encryption = EbmlTagFactory.create(EbmlTagId.ContentEncryption);
        encoding.Children.push(encryption);

        let encAlgo = EbmlTagFactory.create(EbmlTagId.ContentEncAlgo);
        encAlgo.data = 5;
        encryption.Children.push(encAlgo);

        let encKeyId = EbmlTagFactory.create(EbmlTagId.ContentEncKeyID);
        encKeyId.data = crypto.randomBytes(16);
        encryption.Children.push(encKeyId);

        let aesSettings = EbmlTagFactory.create(EbmlTagId.ContentEncAESSettings);
        encryption.Children.push(aesSettings);

        let cipherMode = EbmlTagFactory.create(EbmlTagId.AESSettingsCipherMode);
        cipherMode.data = 1;
        aesSettings.Children.push(cipherMode);

        return encoding;
    }

    private encryptBlockData(simpleBlock: SimpleBlock): void {
        let iv = Buffer.alloc(16);

        let ivCounter = this._trackIvMap[simpleBlock.track];
        if(!ivCounter) {
            ivCounter = new Uint32Array(2);
            crypto.randomFillSync(ivCounter);
            this._trackIvMap[simpleBlock.track] = ivCounter;
        }
        iv.writeUInt32BE(ivCounter[0], 0);
        iv.writeUInt32BE(ivCounter[1], 4);
        
        // Increment IV every frame
        ivCounter[1]++;
        if(ivCounter[1] === 0) {
            ivCounter[0]++;
        }

        let cipher = crypto.createCipheriv('AES-128-CTR', this._keyBuffer, iv);
        simpleBlock.payload = Buffer.concat([
            Buffer.of(0x01),
            iv.subarray(0,8),
            cipher.update(simpleBlock.payload),
            cipher.final()
        ]);
    }
}