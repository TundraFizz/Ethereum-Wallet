# Ethereum Wallet

## Methods

##### GenerateWallets(walletCount, options)
`walletCount` (optional): An integer specifying the amount of Ethereum wallets to generate. If this parameter isn't specified, it will generate a single wallet
`options` (optional): You may pass an `options` object which is detailed below

##### EncryptPrivateKey(key, password, options)
`key`: This must be a hexadecimal string that's exactly 64 characters long; it is the private Ethereum key you will be using to obtain information and create a keystore file for it
`pwd` (optional): You may choose to add a password to your keystore file. If this parameter is omitted, then the keystore file won't have a password
`options` (optional): You may pass an `options` object which is detailed below

## Options

There are five different settings for this program. All default to `true` but can manually be specified
`qrAddress`: If an image of a QR code will be generated for the public Ethereum address
`qrPrivate`: If an image of a QR code will be generated for the private Ethereum key
`identicon`: If an image of the Ethereum address' identicon will be generated
`keyStore`: If a keystore file will be generated
`condensed`: If bulk-data will be put into a single file. Setting this to false will create one text file for each address

You can set these optionals globally. The example below will disable the generation of QR codes for all method runs.
```js
var eth = require("ethereum-wallet");
eth.options["qrAddress"] = false;
eth.options["qrPrivate"] = false;
```

You can also have options apply to a single run only by creating an object with key/values set appropiately. The example will create eight different Ethereum wallets and prevent keystore files from being generated for all of them.
```js
await eth.GenerateWallets(8, {"keyStore": false});
```
