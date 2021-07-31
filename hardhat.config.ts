import { task } from 'hardhat/config'
import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'
import { NetworkUserConfig } from 'hardhat/types'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'

dotenvConfig({ path: resolve(__dirname, './.env') })

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
}

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''
const ACCOUNT_PRIVATE_KEY = process.env.ACCOUNT_PRIVATE_KEY || ''
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ''

function createTestnetConfig(
  network: keyof typeof chainIds,
): NetworkUserConfig {
  const url: string =
    'https://eth-' + network + '.alchemyapi.io/v2/' + ALCHEMY_API_KEY
  return {
    accounts: [ACCOUNT_PRIVATE_KEY],
    chainId: chainIds[network],
    url,
  }
}

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (_, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(await account.getAddress())
  }
})

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.7.6',
  defaultNetwork: 'hardhat',
  hardhat: {
    // See its defaults
    chainId: chainIds.hardhat,
  },
  mainnet: createTestnetConfig('mainnet'),
  goerli: createTestnetConfig('goerli'),
  kovan: createTestnetConfig('kovan'),
  rinkeby: createTestnetConfig('rinkeby'),
  ropsten: createTestnetConfig('ropsten'),
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    enabled: process.env.REPORT_GAS ? true : false,
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
}
