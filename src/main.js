const identicon = require("./identicon.js");
const qr        = require("qr-image");
const elliptic  = require("elliptic");
const sha3      = require("js-sha3");
const ethUtil   = require("ethereumjs-util");
const uuidv4    = require("uuid/v4");
const scrypt    = require("scryptsy");
const readline  = require("readline");
const crypto    = require("crypto");
const fs        = require("fs");
const generator = elliptic.ec("secp256k1").g;

function EthWallet(){
  this.privateKeyBuffer = "";
  this.privateKeyString = "";
  this.publicKeyBuffer  = "";
  this.publicKeyString  = "";
  this.sha3Hash         = "";
  this.ethAddress       = "";
  this.userPassword     = "";
  this.walletCurrent    = 1;
  this.walletMax        = 1;

  this.options = {
    "qrAddress": true,
    "qrPrivate": true,
    "identicon": true,
    "keyStore" : true,
    "condensed": true
  };

  if(!fs.existsSync("./wallets")) fs.mkdirSync("./wallets");
}

/////////////////////
// Private Methods //
/////////////////////

WriteFile = function(file, data){return new Promise((done) => {
  fs.writeFile(file, data, function(){
    done();
  });
})}

AppendFile = function(file, data){return new Promise((done) => {
  fs.appendFile(file, data, function(){
    done();
  });
})}

GetPrivateKey = function(self){
  self.privateKeyBuffer = crypto.randomBytes(32);
  self.privateKeyString = self.privateKeyBuffer.toString("hex");
}

GetPublicKey = function(self){
  var pubPoint = generator.mul(self.privateKeyBuffer); // EC multiplication to determine public point
  var x = pubPoint.getX().toBuffer();                  // 32 bit x coordinate of public point
  var y = pubPoint.getY().toBuffer();                  // 32 bit y coordinate of public point
  self.publicKeyBuffer = Buffer.concat([x,y]);         // Get the public key in binary
  self.publicKeyString = self.publicKeyBuffer.toString("hex");
}

GetEthAddress = function(self){
  self.sha3Hash   = sha3.keccak256(self.publicKeyBuffer);
  self.ethAddress = "0x" + self.sha3Hash.slice(-40);
}

CreateDataFile = async function(self){
  if(self.option["condensed"]){
    var data = `${self.ethAddress},${self.privateKeyString}\n`;
    await AppendFile("wallets/data-all.txt", data);
  }else{
    var data = `ETH Address: ${self.ethAddress}\n`;
    data    += `Private Key: ${self.privateKeyString}\n`;
    await WriteFile(`wallets/data-${self.walletCurrent}.txt`, data);
  }
}

CreateIdenticon = async function(self){
  if(!self.option["identicon"])
    return;

  var icon = identicon.CreateIcon(self.ethAddress);
  await WriteFile(`wallets/identicon-${self.walletCurrent}.png`, icon);
}

CreateQrCodeAddress = function(self){return new Promise((done) => {
  if(!self.option["qrAddress"]){
    done();
    return;
  }

  var qrEthAddress = qr.image(self.ethAddress);
  var stream = qrEthAddress.pipe(fs.createWriteStream(`wallets/eth-address-${self.walletCurrent}.png`));

  stream.on("finish", function(){
    done();
  });
})}

CreateQrCodePrivateKey = function(self){return new Promise((done) => {
  if(!self.option["qrPrivate"]){
    done();
    return;
  }

  var qrPrivateKey = qr.image(self.privateKeyString);
  var stream = qrPrivateKey.pipe(fs.createWriteStream(`wallets/private-key-${self.walletCurrent}.png`));

  stream.on("finish", function(){
    done();
  });
})}

CreateKeystoreFile = async function(self){
  if(!self.option["keyStore"])
    return;

  var salt      = crypto.randomBytes(32);
  var iv        = crypto.randomBytes(16);
  var scryptKey = scrypt(self.userPassword, salt, 8192, 8, 1, 32);

  var cipher     = crypto.createCipheriv("aes-128-ctr", scryptKey.slice(0, 16), iv);
  var first      = cipher.update(self.privateKeyBuffer);
  var final      = cipher.final();
  var ciphertext = Buffer.concat([first, final]);

  var sliced = scryptKey.slice(16, 32);
  sliced     = Buffer.from(sliced, "hex");

  // var mac    = sha3.sha3_256(Buffer.concat([scryptKey.slice(16, 32), Buffer.from(ciphertext, "hex")]));
  // var mac    = sha3.sha3_512(Buffer.concat([scryptKey.slice(16, 32), Buffer.from(ciphertext, "hex")]));
  var mac    = ethUtil.sha3(Buffer.concat([scryptKey.slice(16, 32), Buffer.from(ciphertext, "hex")]));

  var hexCiphertext = ciphertext.toString("hex");
  var hexIv         = Buffer.from(iv).toString("hex");
  var hexSalt       = Buffer.from(salt).toString("hex");
  var hexMac        = Buffer.from(mac).toString("hex");

  var keystoreFile = {
    "version": 3,
    "id"     : uuidv4({"random": crypto.randomBytes(16)}),
    "address": self.ethAddress.slice(-40),
    "crypto" : {
      "ciphertext": hexCiphertext,
      "cipherparams": {
        "iv": hexIv
      },
      "cipher": "aes-128-ctr",
      "kdf": "scrypt",
      "kdfparams": {
        "dklen": 32,
        "salt" : hexSalt,
        "n"    : 8192,
        "r"    : 8,
        "p"    : 1
      },
      "mac": hexMac
    }
  };

  await WriteFile(`wallets/wallet-${self.walletCurrent}.json`, JSON.stringify(keystoreFile, null, 2)+"\n");
}

GenerateFiles = async function(self){
  GetPublicKey(self);
  GetEthAddress(self);

  await CreateDataFile(self);
  await CreateIdenticon(self);
  await CreateQrCodeAddress(self);
  await CreateQrCodePrivateKey(self);
  await CreateKeystoreFile(self);
}

SetOptions = async function(self, options){
  // Option (singular) will be the actual option used in the program
  // Options (plural) stands for the global setting of all options
  self.option = self.options;

  // If the user is temporarily using some custom options
  if(options)
    self.option = options;

  if(!("qrAddress" in self.option)) self.option["qrAddress"] = self.options["qrAddress"];
  if(!("qrPrivate" in self.option)) self.option["qrPrivate"] = self.options["qrPrivate"];
  if(!("identicon" in self.option)) self.option["identicon"] = self.options["identicon"];
  if(!("keyStore"  in self.option)) self.option["keyStore"]  = self.options["keyStore"];
  if(!("condensed" in self.option)) self.option["condensed"] = self.options["condensed"];

  if(self.option["condensed"])
    await WriteFile("wallets/data-all.txt", "");
}

////////////////////
// Public Methods //
////////////////////

EthWallet.prototype.GenerateWallets = async function(walletCount = 1, options){
  await SetOptions(this, options);

  this.walletCurrent = 1;
  this.walletMax = walletCount;

  while(this.walletCurrent < this.walletMax){
    GetPrivateKey(this);
    await GenerateFiles(this);
    console.log(`Wallets generated: ${this.walletCurrent++}/${this.walletMax}`);
  }
}

EthWallet.prototype.EncryptPrivateKey = async function(key, password = "", options){
  await SetOptions(this, options);

  var buffHex = Buffer.from(key, "hex");
  this.privateKeyBuffer = buffHex;
  this.privateKeyString = this.privateKeyBuffer.toString("hex");
  this.userPassword = password;

  await GenerateFiles(this);
  console.log(`Wallets generated: ${this.walletCurrent}/${this.walletMax}`);
}

module.exports = new EthWallet;
