import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { ethers } from 'hardhat'

chai.use(chaiAsPromised)

describe('Lottery contract', function () {
  let Lottery: ContractFactory
  let hardhatLottery: Contract
  let owner: SignerWithAddress | undefined
  let addr1: SignerWithAddress | undefined
  let addr2: SignerWithAddress | undefined

  beforeEach(async function () {
    await ethers.provider.send('hardhat_reset', [])
    Lottery = await ethers.getContractFactory('Lottery')
    ;[owner, addr1, addr2] = await ethers.getSigners()

    hardhatLottery = await Lottery.deploy(
      20, // for quick testing
      ethers.utils.parseEther('0.001'),
    )
  })

  it('State variables are correct', async function () {
    const [gameId, blocksInterval, price, drawBlock] = await Promise.all([
      hardhatLottery.gameId(),
      hardhatLottery.blocksInterval(),
      hardhatLottery.price(),
      hardhatLottery.drawBlock(),
    ])
    expect(gameId.toNumber()).to.equal(1)
    expect(blocksInterval.toNumber()).to.equal(20)
    expect(price).to.equal(ethers.utils.parseEther('0.001'))
    expect(drawBlock.toNumber()).to.equal(21)
  })

  describe('Purchase', () => {
    it('1 ticket', async function () {
      if (owner === undefined) return
      const txn = await hardhatLottery.purchase(1, {
        value: ethers.utils.parseEther('0.001'),
      })
      const receipt = await txn.wait()
      expect(receipt.events.length).to.be.equal(1)
      expect(receipt.events[0].event).to.be.equal('Purchase')

      // sender
      expect(receipt.events[0].args[0]).to.be.equal(owner.address)
      // ticket brought
      expect(receipt.events[0].args[1].toNumber()).to.be.equal(1)
      // gameId
      expect(receipt.events[0].args[2].toNumber()).to.be.equal(1)

      // gameId, tickets[]
      const senderTicket = await hardhatLottery.games(1, 0)
      expect(senderTicket).to.be.equal(owner.address)
    })

    it('3 ticket', async function () {
      if (owner === undefined) return
      const txn = await hardhatLottery.purchase(3, {
        value: ethers.utils.parseEther('0.003'),
      })
      const receipt = await txn.wait()
      expect(receipt.events.length).to.be.equal(1)
      expect(receipt.events[0].event).to.be.equal('Purchase')

      // sender
      expect(receipt.events[0].args[0]).to.be.equal(owner.address)
      // ticket brought
      expect(receipt.events[0].args[1].toNumber()).to.be.equal(3)
      // gameId
      expect(receipt.events[0].args[2].toNumber()).to.be.equal(1)

      // gameId, tickets[]
      const senderTicket = await hardhatLottery.games(1, 0)
      const senderTicket2 = await hardhatLottery.games(1, 1)
      const senderTicket3 = await hardhatLottery.games(1, 2)
      expect(senderTicket).to.be.equal(owner.address)
      expect(senderTicket2).to.be.equal(owner.address)
      expect(senderTicket3).to.be.equal(owner.address)
    })

    it('3 users purchase 2 tickets', async function () {
      if (owner === undefined || addr1 === undefined || addr2 === undefined)
        return
      const [ownerTxn, addr1Txn, addr2Txn] = await Promise.all([
        hardhatLottery.purchase(2, {
          value: ethers.utils.parseEther('0.002'),
        }),
        hardhatLottery.connect(addr1).purchase(2, {
          value: ethers.utils.parseEther('0.002'),
        }),
        hardhatLottery.connect(addr2).purchase(2, {
          value: ethers.utils.parseEther('0.002'),
        }),
      ])
      const [ownerReceipt, addr1Receipt, addr2Receipt] = await Promise.all([
        ownerTxn.wait(),
        addr1Txn.wait(),
        addr2Txn.wait(),
      ])

      // sender
      expect(ownerReceipt.events[0].args[0]).to.be.equal(owner.address)
      // ticket brought
      expect(ownerReceipt.events[0].args[1].toNumber()).to.be.equal(2)
      // gameId
      expect(ownerReceipt.events[0].args[2].toNumber()).to.be.equal(1)

      // sender
      expect(addr1Receipt.events[0].args[0]).to.be.equal(addr1.address)
      // ticket brought
      expect(addr1Receipt.events[0].args[1].toNumber()).to.be.equal(2)
      // gameId
      expect(addr1Receipt.events[0].args[2].toNumber()).to.be.equal(1)

      // sender
      expect(addr2Receipt.events[0].args[0]).to.be.equal(addr2.address)
      // ticket brought
      expect(addr2Receipt.events[0].args[1].toNumber()).to.be.equal(2)
      // gameId
      expect(addr2Receipt.events[0].args[2].toNumber()).to.be.equal(1)

      // gameId, tickets[]
      const senderTicket1 = await hardhatLottery.games(1, 0)
      const senderTicket2 = await hardhatLottery.games(1, 1)
      const senderTicket3 = await hardhatLottery.games(1, 2)
      const senderTicket4 = await hardhatLottery.games(1, 3)
      const senderTicket5 = await hardhatLottery.games(1, 4)
      const senderTicket6 = await hardhatLottery.games(1, 5)

      expect(senderTicket1).to.be.equal(owner.address)
      expect(senderTicket2).to.be.equal(owner.address)
      expect(senderTicket3).to.be.equal(addr1.address)
      expect(senderTicket4).to.be.equal(addr1.address)
      expect(senderTicket5).to.be.equal(addr2.address)
      expect(senderTicket6).to.be.equal(addr2.address)
    })

    it('Unable to purchase, Lucky draw time', async function () {
      await mineBlocks(19) // 20 blocks is lucky draw
      const txn = hardhatLottery.purchase(1, {
        value: ethers.utils.parseEther('0.001'),
      })
      await expect(txn).eventually.to.rejectedWith(Error, 'Lucky draw time!')
    })

    it('0 ticket', async () => {
      const txn = hardhatLottery.purchase(0, {
        value: ethers.utils.parseEther('0.001'),
      })
      await expect(txn).eventually.to.rejectedWith(Error, 'Min 1 ticket.')
    })

    it('Wrong amount send', async () => {
      const txn = hardhatLottery.purchase(3, {
        value: ethers.utils.parseEther('0.002'), // should be 0.003
      })
      await expect(txn).eventually.to.rejectedWith(Error)
    })
  })

  describe('Draw', () => {
    it('1 person', async function () {
      if (owner === undefined) return
      await hardhatLottery.purchase(1, {
        value: ethers.utils.parseEther('0.001'),
      })
      const ownerBalance = await owner.getBalance()
      expect(ownerBalance.toString()).to.be.equal('9999992942248000000000')

      await mineBlocks(18) // 20 blocks is lucky draw
      const drawTxn = await hardhatLottery.draw()
      const receipt = await drawTxn.wait()

      expect(receipt.events.length).to.be.equal(1)
      expect(receipt.events[0].event).to.be.equal('Draw')

      // Winner
      expect(receipt.events[0].args[0]).to.be.equal(owner.address)
      // Amount won
      expect(receipt.events[0].args[1].toNumber()).to.be.equal(
        ethers.utils.parseEther('0.001'),
      )
      // gameId
      expect(receipt.events[0].args[2].toNumber()).to.be.equal(1)

      const newBalance = await owner.getBalance()
      expect(newBalance.toString()).to.be.equal('9999993556424000000000')
    })

    it('3 people', async () => {
      if (owner === undefined || addr1 === undefined || addr2 === undefined)
        return
      await Promise.all([
        hardhatLottery.purchase(2, {
          value: ethers.utils.parseEther('0.002'),
        }),
        hardhatLottery.connect(addr1).purchase(3, {
          value: ethers.utils.parseEther('0.003'),
        }),
        hardhatLottery.connect(addr2).purchase(2, {
          value: ethers.utils.parseEther('0.002'),
        }),
      ])
      await mineBlocks(16) // 20 blocks is lucky draw

      const drawTxn = await hardhatLottery.connect(addr2).draw()
      const receipt = await drawTxn.wait()
      const addresses = [owner, addr1, addr2].map((acc) => acc.address)

      const winner = receipt.events[0].args[0]
      // Winner
      expect(addresses).to.include(winner)
      // Amount won
      expect(receipt.events[0].args[1].toNumber()).to.be.equal(
        ethers.utils.parseEther('0.007'),
      )
      // gameId
      expect(receipt.events[0].args[2].toNumber()).to.be.equal(1)

      switch (winner) {
        case owner.address:
          const ownerBal = await owner.getBalance()
          expect(ownerBal.toString()).to.be.equal('9999998761200000000000')
          break
        case addr1.address:
          const addr1Bal = await addr1.getBalance()
          expect(addr1Bal.toString()).to.be.equal('10000003177920000000000')
          break
        case addr2.address:
          const addr2Bal = await addr2.getBalance()
          expect(addr2Bal.toString()).to.be.equal('10000003858128000000000')
          break
        default:
          break
      }
    })

    it('Game 1, 2 people. Game 2, 3 people', async () => {
      if (owner === undefined || addr1 === undefined || addr2 === undefined)
        return

      // GAME 1
      await Promise.all([
        hardhatLottery.purchase(10, {
          value: ethers.utils.parseEther('0.01'),
        }),
        hardhatLottery.connect(addr1).purchase(4, {
          value: ethers.utils.parseEther('0.004'),
        }),
      ])
      await mineBlocks(17) // 20 blocks is lucky draw

      const drawTxn = await hardhatLottery.connect(addr1).draw()
      const receipt = await drawTxn.wait()
      const addresses = [owner, addr1].map((acc) => acc.address)

      const winner = receipt.events[0].args[0]
      // Winner
      expect(addresses).to.include(winner)
      // Amount won
      expect(receipt.events[0].args[1]).to.be.equal(
        ethers.utils.parseEther('0.014'),
      )
      // gameId
      expect(receipt.events[0].args[2].toNumber()).to.be.equal(1)

      // check balance of winner
      switch (winner) {
        case owner.address:
          const ownerBal = await owner.getBalance()
          expect(ownerBal.toString()).to.be.equal('9999996312816000000000')
          break
        case addr1.address:
          const addr1Bal = await addr1.getBalance()
          expect(addr1Bal.toString()).to.be.equal('10000008361848000000000')
          break
        default:
          break
      }

      // GAME 2
      const [gameId, drawBlock] = await Promise.all([
        hardhatLottery.gameId(),
        hardhatLottery.drawBlock(),
      ])
      expect(gameId.toNumber()).to.equal(2)
      expect(drawBlock.toNumber()).to.equal(41)
      const [ownerTxn, addr1Txn, addr2Txn] = await Promise.all([
        hardhatLottery.purchase(8, {
          value: ethers.utils.parseEther('0.008'),
        }),
        hardhatLottery.connect(addr1).purchase(4, {
          value: ethers.utils.parseEther('0.004'),
        }),
        hardhatLottery.connect(addr2).purchase(20, {
          value: ethers.utils.parseEther('0.02'),
        }),
      ])
      const [ownerReceipt, addr1Receipt, addr2Receipt] = await Promise.all([
        ownerTxn.wait(),
        addr1Txn.wait(),
        addr2Txn.wait(),
      ])
      // sender (owner)
      expect(ownerReceipt.events[0].args[0]).to.be.equal(owner.address)
      // ticket brought
      expect(ownerReceipt.events[0].args[1].toNumber()).to.be.equal(8)
      // gameId
      expect(ownerReceipt.events[0].args[2].toNumber()).to.be.equal(2)
      // sender (addr1)
      expect(addr1Receipt.events[0].args[0]).to.be.equal(addr1.address)
      // ticket brought
      expect(addr1Receipt.events[0].args[1].toNumber()).to.be.equal(4)
      // gameId
      expect(addr1Receipt.events[0].args[2].toNumber()).to.be.equal(2)
      // sender (addr2)
      expect(addr2Receipt.events[0].args[0]).to.be.equal(addr2.address)
      // ticket brought
      expect(addr2Receipt.events[0].args[1].toNumber()).to.be.equal(20)
      // gameId
      expect(addr2Receipt.events[0].args[2].toNumber()).to.be.equal(2)

      await mineBlocks(16) // 40 blocks is lucky draw

      const drawTxn2 = await hardhatLottery.connect(addr1).draw()
      const receipt2 = await drawTxn2.wait()
      const addresses2 = [owner, addr1, addr2].map((acc) => acc.address)
      const winner2 = receipt2.events[0].args[0]
      // Winner
      expect(addresses2).to.include(winner2)
      // Amount won
      expect(receipt2.events[0].args[1]).to.be.equal(
        ethers.utils.parseEther('0.032'),
      )
      // gameId
      expect(receipt2.events[0].args[2].toNumber()).to.be.equal(2)

      switch (winner2) {
        case owner.address:
          const ownerBal = await owner.getBalance()
          expect(ownerBal.toString()).to.be.equal('10000004448696000000000')
          break
        case addr1.address:
          const addr1Bal = await addr1.getBalance()
          expect(addr1Bal.toString()).to.be.equal('10000020358608000000000')
          break
        case addr2.address:
          const addr2Bal = await addr2.getBalance()
          expect(addr2Bal.toString()).to.be.equal('10000008100104000000000')
          break
        default:
          break
      }
    })
    it('Not time yet.', async () => {
      if (owner === undefined || addr1 === undefined || addr2 === undefined)
        return
      await Promise.all([
        hardhatLottery.purchase(2, {
          value: ethers.utils.parseEther('0.002'),
        }),
        hardhatLottery.connect(addr1).purchase(3, {
          value: ethers.utils.parseEther('0.003'),
        }),
        hardhatLottery.connect(addr2).purchase(2, {
          value: ethers.utils.parseEther('0.002'),
        }),
      ])
      const drawTxn = hardhatLottery.connect(addr2).draw()

      await expect(drawTxn).eventually.to.rejectedWith(Error, 'Not time yet!')
    })
    it('No players', async () => {
      await mineBlocks(19) // 20 blocks is lucky draw
      const drawTxn = await hardhatLottery.draw()
      const receipt = await drawTxn.wait()

      // Winner (Nobody won)
      expect(receipt.events[0].args[0]).to.be.equal(
        '0x0000000000000000000000000000000000000000',
      )
      // Amount won
      expect(receipt.events[0].args[1]).to.be.equal(
        ethers.utils.parseEther('0'),
      )
      // gameId
      expect(receipt.events[0].args[2].toNumber()).to.be.equal(1)

      const [gameId, drawBlock] = await Promise.all([
        hardhatLottery.gameId(),
        hardhatLottery.drawBlock(),
      ])
      expect(gameId.toNumber()).to.equal(2)
      expect(drawBlock.toNumber()).to.equal(41)
    })
  })
})

async function mineBlocks(blockNumber: number) {
  while (blockNumber > 0) {
    blockNumber--
    await ethers.provider.send('evm_mine', [])
  }
}
