"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EthereumWallet_1 = __importDefault(require("./src/EthereumWallet"));
// import { Database }       from "./src/EthereumWallet";
async function Main() {
    // EthereumWallet.options["qrAddress"] = false;
    // EthereumWallet.options["qrPrivate"] = false;
    // EthereumWallet.prototype.engine = "hi";
    // EthereumWallet.
    // const ethWallet = new EthereumWallet("yolo");
    // const ethWallet = EthereumWallet;
    // ethWallet
    // console.log(EthereumWallet);
    // console.log(ethWallet.disp());
    // console.log(ethereumWallet);
    // EthereumWallet.prototype.disp();
    const ethWallet = new EthereumWallet_1.default("hi");
    console.log(ethWallet.disp());
}
Main();
