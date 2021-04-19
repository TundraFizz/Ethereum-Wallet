const identicon = require("./lib/identicon.js");
const scrypt = require("./lib/scrypt.js");
// const crypto = require("crypto");
// const fs = require("fs");
const sha3 = require("js-sha3");
const qr = require("qr-image");
const uuidv4 = require("uuid/v4");
const elliptic = require("elliptic");

// import identicon = require("./lib/identicon.js");
// import scrypt = require("./lib/scrypt.js");
import crypto = require("crypto");
import fs = require("fs");
// import sha3 = require("js-sha3");
// import qr = require("qr-image");
// import uuidv4 = require("uuid/v4");
// import elliptic = require("elliptic");
const generator = elliptic.ec("secp256k1").g;

interface Options {
  qrAddress?: boolean;
  qrPrivate?: boolean;
  identicon?: boolean;
  keyStore ?: boolean;
  condensed?: boolean;
}

interface PrivateKeyInfo {
  privateKeyBuffer: Buffer;
  privateKeyString: string;
}

interface PublicKeyInfo {
  publicKeyBuffer : Buffer;
  publicKeyString : string;
  publicKeyAddress: string;
}

export default class EthereumWallet {
  private privateKeyBuffer: Buffer  = Buffer.from("");
  private publicKeyBuffer : Buffer  = Buffer.from("");
  private privateKeyString: string  = "";
  private publicKeyString : string  = "";
  private sha3Hash        : string  = "";
  private ethAddress      : string  = "";
  private userPassword    : string  = "";
  private walletCurrent   : number  = 1;
  private walletMax       : number  = 1;
  public  options         : Options = {
    qrAddress: true,
    qrPrivate: true,
    identicon: true,
    keyStore : true,
    condensed: true
  };

  constructor(options: Options = {}) {
    if ("qrAddress" in options) this.options.qrAddress = options.qrAddress;
    if ("qrPrivate" in options) this.options.qrPrivate = options.qrPrivate;
    if ("identicon" in options) this.options.identicon = options.identicon;
    if ("keyStore"  in options) this.options.keyStore  = options.keyStore;
    if ("condensed" in options) this.options.condensed = options.condensed;

    if (!fs.existsSync("./wallets")) fs.mkdirSync("./wallets");
  }

  /////////////////////
  // PRIVATE METHODS //
  /////////////////////

  private WriteFile(file: number | fs.PathLike, data: string | NodeJS.ArrayBufferView): any {
    return new Promise<void> ((done) => {
      fs.writeFile(file, data, function() {
        done();
      });
  })}

  private AppendFile(file: number | fs.PathLike, data: string | Uint8Array): any {
    return new Promise<void> ((done) => {
      fs.appendFile(file, data, function() {
        done();
      });
  })}

  private GetPrivateKey(): PrivateKeyInfo {
    const privateKeyBuffer = crypto.randomBytes(32);
    const privateKeyString = privateKeyBuffer.toString("hex");

    return {
      privateKeyBuffer: privateKeyBuffer,
      privateKeyString: privateKeyString
    };
  }

  private GetPublicKey(privateKeyInfo: PrivateKeyInfo): PublicKeyInfo {
    const pubPoint = generator.mul(privateKeyInfo.privateKeyBuffer); // EC multiplication to determine public point
    const x                = pubPoint.getX().toBuffer();             // 32 bit x coordinate of public point
    const y                = pubPoint.getY().toBuffer();             // 32 bit y coordinate of public point
    const publicKeyBuffer  = Buffer.concat([x, y]);
    const publicKeyString  = publicKeyBuffer.toString("hex");
    const sha3Hash         = sha3.keccak256(publicKeyBuffer);
    const publicKeyAddress = "0x" + sha3Hash.slice(-40);

    return {
      publicKeyBuffer : publicKeyBuffer,
      publicKeyString : publicKeyString,
      publicKeyAddress: publicKeyAddress
    };
  }

  private async CreateDataFile(walletCurrent: number, privateKeyInfo: PrivateKeyInfo, publicKeyInfo: PublicKeyInfo): Promise<void> {
    if (this.options.condensed) {
      const data = `${publicKeyInfo.publicKeyAddress},${privateKeyInfo.privateKeyString}\n`;
      await this.AppendFile("wallets/data-all.txt", data);
    } else {
      let data = `ETH Address: ${publicKeyInfo.publicKeyAddress}\n`;
      data    += `Private Key: ${privateKeyInfo.privateKeyString}\n`;
      await this.WriteFile(`wallets/data-${walletCurrent}.txt`, data);
    }
  }

  private async CreateIdenticon(walletCurrent: number, publicKeyInfo: PublicKeyInfo): Promise<void> {
    if (!this.options.identicon) {
      return;
    }

    const icon = identicon.CreateIcon(publicKeyInfo.publicKeyAddress);
    await this.WriteFile(`wallets/identicon-${walletCurrent}.png`, icon);
  }

  private async CreateQrCodeAddress(walletCurrent: number, publicKeyInfo: PublicKeyInfo): Promise<any> {
    return new Promise<void> ((done) => {
      if (!this.options.qrAddress) {
        done();
        return;
      }

      const qrEthAddress = qr.image(publicKeyInfo.publicKeyAddress);
      const stream = qrEthAddress.pipe(fs.createWriteStream(`wallets/eth-address-${walletCurrent}.png`));

      stream.on("finish", function() {
        done();
      });
    })
  }

  private async CreateQrCodePrivateKey(walletCurrent: number, privateKeyInfo: PrivateKeyInfo): Promise<any> {
    return new Promise<void> ((done) => {
      if (!this.options.qrPrivate) {
        done();
        return;
      }

      const qrPrivateKey = qr.image(privateKeyInfo.privateKeyString);
      const stream = qrPrivateKey.pipe(fs.createWriteStream(`wallets/private-key-${walletCurrent}.png`));

      stream.on("finish", function() {
        done();
      });
    })
  }

  // Under construction
  private async CreateKeystoreFile(password: string, privateKeyInfo: PrivateKeyInfo): Promise<any> {
    if (!this.options.keyStore) {
      return;
    }

    // let sliced: Buffer | WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: "string"): string; };
    let sliced: any;
    const salt          = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
    const iv            = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const scryptKey     = scrypt(this.userPassword, salt, 8192, 8, 1, 32);
    const cipher        = crypto.createCipheriv("aes-128-ctr", scryptKey.slice(0, 16), iv);
    const first         = cipher.update(privateKeyInfo.privateKeyBuffer);
    const final         = cipher.final();
    const ciphertext: any = Buffer.concat([first, final]);
    sliced              = scryptKey.slice(16, 32);
    sliced              = Buffer.from(sliced, "hex");
    const a1: any = scryptKey.slice(16, 32);
    const a2: any = Buffer.from(ciphertext, "hex");
    const a3            = Buffer.concat([a1, a2]);
    const hexMac        = sha3.keccak256(a3);
    const hexCiphertext = ciphertext.toString("hex");
    const hexIv         = Buffer.from(iv).toString("hex");
    const hexSalt       = Buffer.from(salt).toString("hex");
    // const hexMac        = Buffer.from(mac).toString("hex");

    const keystoreFile = {
      version: 3,
      id     : uuidv4({random: crypto.randomBytes(16)}),
      address: this.ethAddress.slice(-40),
      crypto : {
        ciphertext: hexCiphertext,
        cipherparams: {
          iv: hexIv
        },
        cipher: "aes-128-ctr",
        kdf: "scrypt",
        kdfparams: {
          dklen: 32,
          salt : hexSalt,
          n    : 8192,
          r    : 8,
          p    : 1
        },
        mac: hexMac
      }
    };

    await this.WriteFile(`wallets/wallet-${this.walletCurrent}.json`, JSON.stringify(keystoreFile, null, 2) + "\n");
  }

  private async GenerateFiles(walletCurrent: number, privateKeyInfo: PrivateKeyInfo): Promise<void> {
    const publicKeyInfo: PublicKeyInfo = this.GetPublicKey(privateKeyInfo);
    await this.CreateDataFile(walletCurrent, privateKeyInfo, publicKeyInfo);
    await this.CreateIdenticon(walletCurrent, publicKeyInfo);
    await this.CreateQrCodeAddress(walletCurrent, publicKeyInfo);
    await this.CreateQrCodePrivateKey(walletCurrent, privateKeyInfo);

    // Under construction
    // await this.CreateKeystoreFile();
  }

  ////////////////////
  // PUBLIC METHODS //
  ////////////////////

  async GenerateWallets(walletMax: number): Promise<any> {
    let walletCurrent = 0;

    while (walletCurrent < walletMax) {
      let pkInfo: PrivateKeyInfo = this.GetPrivateKey();
      await this.GenerateFiles(++walletCurrent, pkInfo);
      console.log(`Wallets generated: ${walletCurrent}/${walletMax}`);
    }
  }

  // Under construction
  /* async EncryptPrivateKey(key: string, password: string): Promise<any> {
    const buffHex = Buffer.from(key, "hex");
    this.privateKeyBuffer = buffHex;
    this.privateKeyString = this.privateKeyBuffer.toString("hex");
    this.userPassword = password;

    await this.GenerateFiles();
    console.log(`Wallets generated: ${this.walletCurrent}/${this.walletMax}`);
  } */
}
