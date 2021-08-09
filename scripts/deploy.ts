import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  if (deployer === undefined) throw new Error('Deployer is undefined.')
  console.log('Deploying contracts with the account:', deployer.address)

  console.log('Account balance:', (await deployer.getBalance()).toString())

  const Lottery = await ethers.getContractFactory('Lottery')
  const lottery = await Lottery.deploy(
    6350, // about 1 day worth of blocks mined
    ethers.utils.parseEther('0.001'),
  )

  console.log('Token address:', lottery.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
