import EthereumWallet from "./src/EthereumWallet";

async function Main() {
  const ethWallet = new EthereumWallet();
  ethWallet.GenerateWallets(10);
}

Main();
