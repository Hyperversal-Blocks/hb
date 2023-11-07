import 'hardhat-deploy-ethers';
import '@nomiclabs/hardhat-etherscan';
import hre, {artifacts, network} from 'hardhat';
import * as fs from 'fs';
import {ethers} from 'ethers';
import {RpcToken} from '../hardhat.config';
import '@nomiclabs/hardhat-etherscan/dist/src/type-extensions';
import '@openzeppelin/hardhat-upgrades';
import hblock from '../artifacts/contracts/HBLOCK.sol/HBLOCK.json'
import { spawnSync } from 'child_process';

const {upgrades} = require("hardhat")

let account: ethers.Wallet;

let configurations: ChainConfig;

interface DeployedContract {
  abi: Array<unknown>;
  bytecode: string;
  address: string;
  block: number;
  url: string;
}

interface DeployedData {
  chainId: number;
  contracts: {
    hblock: DeployedContract;
    staking: DeployedContract;
  };
}

interface ChainConfig {
  chainId?: number;
  networkName: string;
  deployedData: DeployedData;
  url: string;
}

interface Mnemonic {
  mnemonic: string;
}

let networkDeployedData: DeployedData;
try {
  networkDeployedData = require('../' + network.name + '_deployed.json');
} catch (e) {
  networkDeployedData = {
    chainId: network.config.chainId,
    contracts: {
      hblock: {} as DeployedContract,
      staking: {} as DeployedContract
    },
  } as unknown as DeployedData;
}

const configs: Record<string, ChainConfig> = {
  testnet: {
    chainId: network.config.chainId,
    networkName: network.name,
    deployedData: networkDeployedData,
    url: hre.config.etherscan.customChains[0]['urls']['browserURL'].toString(),
  },
  mainnet: {
    chainId: network.config.chainId,
    networkName: network.name,
    deployedData: networkDeployedData,
    url: hre.config.etherscan.customChains[1]['urls']['browserURL'].toString(),
  },
};

const config: ChainConfig = configs[network.name]
  ? configs[network.name]
  : ({
    chainId: network.config.chainId,
    networkName: network.name,
    deployedData: networkDeployedData,
    url: '',
  } as ChainConfig);

const blockChainVendor = hre.network.name;

async function setConfigurations() {
  let wallet: ethers.Wallet;
  if (Array.isArray(hre.network.config.accounts)) {
    if (hre.network.config.accounts.length > 1) {
      throw new Error('only 1 private key expected');
    }
    wallet = new ethers.Wallet(hre.network.config.accounts[0] as string);
  } else if (isMnemonic(hre.network.config.accounts)) {
    wallet = ethers.Wallet.fromMnemonic(hre.network.config.accounts.mnemonic);
  } else {
    throw new Error('unknown type');
  }
  switch (blockChainVendor) {
    case 'testnet':
      account = wallet.connect(new ethers.providers.JsonRpcProvider(RpcToken));
      configurations = configs['testnet'];
      break;
    case 'mainnet':
      account = wallet.connect(new ethers.providers.JsonRpcProvider(process.env.MAINNETPROVIDER));
      configurations = configs['mainnet'];
      break;
    default:
      account = wallet.connect(hre.ethers.provider);
      configurations = configs['private'];
  }
}

function isMnemonic(param: unknown): param is Mnemonic {
  return typeof param === 'object' && param != null && 'mnemonic' in param;
}

async function main() {
  //set configs
  await setConfigurations()

  let deployed = await JSON.parse(JSON.stringify(config.deployedData).toString());

  // Deploy the HBLOCK.sol contract and set metadata
  deployed = await deployhblock(deployed)

  await writeFile(deployed)

  if (process.env.MAINNET_ETHERSCAN_KEY || process.env.TESTNET_ETHERSCAN_KEY) {
    console.log('Verifying...');

    await verify(
      deployed['contracts']['hblock']['address'],
      account.address,
    );
  }
}

async function deployhblock(deployed: any) {
  //deploy
  console.log('Deploying HBLOCK.sol contract...');
  const hblockTokenContract = await new ethers.ContractFactory(hblock.abi, hblock.bytecode).connect(account)
  const hblockToken = await hblockTokenContract.deploy(account.address);
  console.log('tx hash:' + hblockToken.deployTransaction.hash);
  await hblockToken.deployed();
  console.log("Contract deployed to " + hblockToken.address)
  let deployTx = await hblockToken.deployTransaction.wait(1);
  return await setMetadata(deployTx, "hblock", deployed, hblockToken.address, hblock.abi, hblock.bytecode.toString())
}

async function setMetadata(
  deploymentReceipt: any,
  contractName: string,
  deployed: any,
  address: string,
  abi: any,
  bytecode: string) {
  deployed['contracts'][contractName]['abi'] = abi;
  deployed['contracts'][contractName]['bytecode'] = bytecode;
  deployed['contracts'][contractName]['address'] = address;
  deployed['contracts'][contractName]['block'] = deploymentReceipt.blockNumber;
  deployed['contracts'][contractName]['url'] = config.url + "address/" + address;

  return deployed
}

async function writeFile(deployed: any) {
  await fs.writeFileSync(config.networkName + '_deployed.json', JSON.stringify(deployed, null, '\t'));
}


async function verify(address: string, args: string) {
  const sp = spawnSync('npx hardhat verify ' + address + ' ' + args + ' --network testnet ', [], {
    timeout: 30000,
    stdio: ['inherit', 'inherit', 'pipe'],
    shell: true,
  });
  if (sp.stderr.toString('utf-8').includes('Already Verified')) {
    console.log('Contract already verified');
  } else if (sp.stderr.toString() === null || sp.stderr.toString() === '') {
    console.log('Contract Verified Successfully');
  } else {
    throw new Error(sp.stderr.toString());
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
