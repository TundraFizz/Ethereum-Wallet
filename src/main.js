// const identicon = require("./identicon.js");
// const qr        = require("qr-image");
// const sha3      = require("js-sha3");
// const ethUtil   = require("ethereumjs-util");
// const uuidv4    = require("uuid/v4");
// const scrypt    = require("scryptsy");
// const readline  = require("readline");
// const crypto    = require("crypto");
const fs       = require("fs");
const cluster  = require("cluster");
var   cpuCount = require("os").cpus().length;
// const elliptic  = require("elliptic");
// const generator = elliptic.ec("secp256k1").g;

// cluster.setupMaster({"exec": "ethereum-wallet.js"});
cluster.setupMaster({"exec": "/Users/leifcoleman/Git/Ethereum-Wallet/src/ethereum-wallet.js"});

function EthWallet(){
  // this.privateKeyBuffer = "";
  // this.privateKeyString = "";
  // this.publicKeyBuffer  = "";
  // this.publicKeyString  = "";
  // this.sha3Hash         = "";
  // this.ethAddress       = "";
  // this.userPassword     = "";
  // this.walletCurrent    = 1;
  // this.walletMax        = 1;

  this.options = {
    "qrAddress": true,
    "qrPrivate": true,
    "identicon": true,
    "keyStore" : true,
    "condensed": true,
    "wallets"  : 1,
    "cpu"      : "auto"
  };

  if(!fs.existsSync("./wallets")) fs.mkdirSync("./wallets");
}

WriteFile = function(file, data){return new Promise((done) => {
  fs.writeFile(file, data, function(){
    done();
  });
})}

SetOptions = async function(self, walletCount, options){
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
  if(!("cpu"       in self.option)) self.option["cpu"]       = self.options["cpu"];

  self.option["wallets"] = walletCount;

  if(self.option["condensed"])
    await WriteFile("wallets/data-all.txt", "");
}

Fork = function(self){return new Promise((done) => {
  var wallets  = self.option["wallets"];
  // var cpuCount = self.option["cpu"];
  cpuCount = 8;

  var min = Math.floor(wallets / cpuCount);
  var max = min + 1;
  var b   = wallets % cpuCount;

  var forkMultiplier = 1;
  var totalForks     = cpuCount * forkMultiplier;
  var workerCount    = totalForks;

  for(var i = 0; i < totalForks; i++){
    var cur;
    var qweqweqwe = 1;

    if(i >= b){
      cur = min;
      qweqweqwe = b + 1;
    }
    else
      cur = max;

    var start = i * cur + qweqweqwe;
    console.log(`i: ${i}   wallets: ${cur}   start: ${start}`);

    cluster.fork({
      "wallets": cur,
      "start"  : start,
      "options": JSON.stringify(self.option)
    });
  }

  cluster.on("exit", (worker, code, signal) => {
    if(--workerCount == 0){
      done();
    }
  });
})}

EthWallet.prototype.GenerateWallets = async function(walletCount = 1, options){
  await SetOptions(this, walletCount, options);
  await Fork(this);
}

EthWallet.prototype.EncryptPrivateKey = async function(key, password = "", options){
  ;
}

module.exports = new EthWallet;
