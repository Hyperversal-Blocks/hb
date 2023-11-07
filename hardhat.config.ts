import 'dotenv/config';
import {HardhatUserConfig} from 'hardhat/types';
import 'solidity-coverage';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'hardhat-tracer';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-contract-sizer';
import {removeConsoleLog} from 'hardhat-preprocessor';
require('@openzeppelin/hardhat-upgrades');

export const RpcToken = process.env.RPC_TOKEN === undefined ? 'undefined' : process.env.RPC_TOKEN;
if (RpcToken === 'undefined') {
  console.log('Please set your INFURA_TOKEN in a .env file');
}

// Set Private RPCs if added, otherwise use Public that are hardcoded in this config

const PRIVATE_RPC_MAINNET = !process.env.RPC_TOKEN ? undefined : process.env.RPC_TOKEN;
const PRIVATE_RPC_TESTNET = !process.env.RPC_TOKEN ? undefined : process.env.RPC_TOKEN;

const walletSecret = process.env.WALLET_SECRET === undefined ? 'undefined' : process.env.WALLET_SECRET;
if (walletSecret === 'undefined') {
  console.log('Please set your WALLET_SECRET in a .env file');
}
const accounts = walletSecret.length === 64 ? [walletSecret] : {mnemonic: walletSecret};

const mainnetEtherscanKey = process.env.MAINNET_ETHERSCAN_KEY;
const testnetEtherscanKey = process.env.TESTNET_ETHERSCAN_KEY;

// Config for hardhat.
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  preprocess: {
    eachLine: removeConsoleLog((hre) => hre.network.name !== 'hardhat' && hre.network.name !== 'localhost'),
  },
  namedAccounts: {
    deployer: 0,
    admin: 1
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0,
      hardfork: 'merge'
    },
    localhost: {
      url: 'http://localhost:8545',
      chainId: 1,
      accounts
    },
    testnet: {
      url: RpcToken,
      accounts,
      chainId: 80001
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/' + RpcToken,
      accounts,
      chainId: 1
    }
  },
  etherscan: {
    apiKey: {
      mainnet: mainnetEtherscanKey || '',
      testnet: testnetEtherscanKey || ''
    },
    customChains: [
      {
        network: 'testnet',
        chainId: 80001,
        urls: {
          apiURL: 'https://api-testnet.polygonscan.com/api',
          browserURL: 'https://mumbai.polygonscan.com/'
        }
      },
      {
        network: 'mainnet',
        chainId: 1,
        urls: {
          apiURL: '',
          browserURL: ''
        }
      }
    ]
  },
  contractSizer: {
    runOnCompile: true
  }
};

export default config;
