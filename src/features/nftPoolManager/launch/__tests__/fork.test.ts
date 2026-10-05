/** @jest-environment node */
import { readFileSync } from 'fs'
import { join } from 'path'
import { BigNumber } from '@ethersproject/bignumber'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Contract, ContractFactory } from '@ethersproject/contracts'
import { parseEther, parseUnits } from '@ethersproject/units'
import { calculatePoolEconomics } from '../../economics'
import { createEmptyNftPoolDraft } from '../../registry'
import { buildNftPoolDeploymentPlan } from '../../validation'
import { WPOL_ADDRESS } from '../../rewardTokens'
import { getNftPoolRegistry } from '../../discovery'
import { toPublicV2Pool, toVerifiedNftPool } from '../../publication'
import { prepareNftLaunchSchedule } from '../schedule'
import { configureNftCollectionWeights, configureNftPerformanceFee, deployNftPool } from '../transactions'
import { fundNftPoolTokenIfNeeded, primaryFundingAmount, sideFundingAmount } from '../funding'
import {
  verifyDeployedNftPool,
  verifyFinalNftLaunch,
  verifyNftCollectionWeights,
  verifyNftFunding,
  verifyNftPerformanceFee,
} from '../verification'
import { getNftSmartChefFactoryAddress } from 'utils/addressHelpers'
import {
  approveV2PoolCollection,
  emergencyWithdrawV2Position,
  harvestV2Pool,
  stakeV2Nfts,
  unstakeV2Nfts,
} from '../../user/transactions'
import { assertV2StakeLimits, readV2UserPosition } from '../../user/readers'
import { readV2UserPositionSummary, readV2UserRecoveryPosition } from '../../user/recovery'
import { readV2OwnedNfts } from '../../user/nftDiscovery'

const forkUrl = process.env.COINCOLLECT_FORK_RPC
const forkTest = forkUrl ? it : it.skip
const preservePublishedTestPool = process.env.COINCOLLECT_FORK_PRESERVE_TEST_POOL === '1'

forkTest(
  'discovers a real factory deployment, verifies public readiness and runs the user lifecycle on an isolated fork',
  async () => {
    const url = new URL(forkUrl!)
    if (
      url.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.username ||
      url.password
    )
      throw new Error('Fork writes require an explicit loopback HTTP endpoint.')
    const provider = new JsonRpcProvider(forkUrl)
    expect((await provider.getNetwork()).chainId).toBe(Number(process.env.COINCOLLECT_FORK_CHAIN_ID || 137))
    // This method proves the endpoint is a local Anvil instance before any write.
    await provider.send('anvil_nodeInfo', [])
    const checkpoint = await provider.send('evm_snapshot', [])
    const factoryAddress = getNftSmartChefFactoryAddress(137)!
    let owner: string | undefined
    let preservedDiscoveredPool = false
    try {
      const factoryOwner: string = await new Contract(
        factoryAddress,
        ['function owner() view returns (address)'],
        provider,
      ).owner()
      owner = factoryOwner
      await provider.send('anvil_impersonateAccount', [factoryOwner])
      await provider.send('anvil_setBalance', [factoryOwner, '0x3635c9adc5dea00000'])
      const signer = provider.getSigner(factoryOwner)
      const compilerModule =
        process.env.COINCOLLECT_SOLC_MODULE ||
        require.resolve('solc', { paths: [process.cwd(), join(process.cwd(), 'scripts/local-fork-tool')] })
      const compiler = require(compilerModule)
      const output = JSON.parse(
        compiler.compile(
          JSON.stringify({
            language: 'Solidity',
            sources: {
              'LaunchAssets.sol': { content: readFileSync(join(__dirname, 'fixtures/LaunchAssets.sol'), 'utf8') },
            },
            settings: { evmVersion: 'paris', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } },
          }),
        ),
      )
      const deployAsset = async (name: string) => {
        const artifact = output.contracts['LaunchAssets.sol'][name]
        const contract = await new ContractFactory(artifact.abi, artifact.evm.bytecode.object, signer).deploy()
        await contract.deployed()
        return contract
      }
      const primaryNft = await deployAsset('LaunchNFT')
      const communityNft = await deployAsset('LaunchNFT')
      const sideToken = await deployAsset('LaunchReward')
      const wrapped = new Contract(
        WPOL_ADDRESS,
        ['function deposit() payable', 'function transfer(address,uint256) returns (bool)'],
        signer,
      )
      await (await wrapped.deposit({ value: parseEther('2') })).wait()
      const draft = createEmptyNftPoolDraft()
      draft.name = 'Fork verified NFT pool'
      draft.banner = '/images/poolBanners/nfts/key.webp'
      draft.constraints.performanceFee = '1000000000000000'
      draft.constraints.performanceFeeRecipient = factoryOwner
      draft.collections = [
        { chainId: 137, address: primaryNft.address, collectionId: 'key', name: 'KEY', primary: true, weight: '30' },
        {
          chainId: 137,
          address: communityNft.address,
          collectionId: 'starter',
          name: 'Starter',
          primary: false,
          weight: '1',
        },
      ]
      draft.constraints.participantThreshold = '40'
      draft.constraints.poolCapacity = '1'
      draft.constraints.userLimitEnabled = false
      draft.economics.durationPreset = 'custom'
      draft.economics.customDurationDays = '3'
      draft.economics.totalBudget = '10'
      draft.economics.budgetTokenAddress = sideToken.address
      draft.economics.budgetDecimals = 6
      draft.rewards = {
        primary: { address: WPOL_ADDRESS, symbol: 'WPOL', name: 'Wrapped POL', decimals: 18 },
        side: [{ address: sideToken.address, symbol: 'FUSDT', name: 'Fork USDT', decimals: 6 }],
      }
      draft.economics.allocationBps = { [WPOL_ADDRESS]: '5000', [sideToken.address.toLowerCase()]: '5000' }
      draft.economics.manualAmounts = { [WPOL_ADDRESS]: '1', [sideToken.address.toLowerCase()]: '0.25' }
      // Accelerated fork timing keeps real block-driven lifecycle tests bounded.
      // Production uses measured Polygon timing; the engine and contract are unchanged.
      const forkSecondsPerBlock = 1440
      const economics = calculatePoolEconomics(draft, forkSecondsPerBlock)
      const plan = buildNftPoolDeploymentPlan(draft, economics, factoryAddress, factoryOwner)!
      expect(plan).not.toBeNull()
      const schedule = prepareNftLaunchSchedule(plan, await provider.getBlockNumber(), forkSecondsPerBlock)
      const deployment = await deployNftPool(signer, factoryAddress, plan, schedule)
      console.info('Fork: factory deployment confirmed')
      const deployed = await verifyDeployedNftPool(provider, plan, schedule, deployment.poolAddress)
      expect(deployed.checks.filter((check) => check.status === 'BLOCK')).toEqual([])
      await configureNftCollectionWeights(signer, deployment.poolAddress, plan)
      const feeReceipt = await configureNftPerformanceFee(
        signer,
        deployment.poolAddress,
        plan.postDeploy.feeTo!,
        plan.postDeploy.performanceFee!,
      )
      const fee = await verifyNftPerformanceFee(provider, plan, deployment.poolAddress)
      expect(fee.passed).toBe(true)
      const weights = await verifyNftCollectionWeights(provider, plan, deployment.poolAddress)
      expect(weights.passed).toBe(true)
      // Prefund part of the primary requirement; the engine transfers only the remainder.
      const required = primaryFundingAmount(plan)
      await (await wrapped.transfer(deployment.poolAddress, required.div(4))).wait()
      const primary = await fundNftPoolTokenIfNeeded(signer, deployment.poolAddress, WPOL_ADDRESS, required)
      expect(primary.beforePoolBalance.eq(required.div(4))).toBe(true)
      expect(primary.afterPoolBalance.eq(required)).toBe(true)
      expect((await fundNftPoolTokenIfNeeded(signer, deployment.poolAddress, WPOL_ADDRESS, required)).status).toBe(
        'SKIPPED',
      )
      await fundNftPoolTokenIfNeeded(
        signer,
        deployment.poolAddress,
        sideToken.address,
        sideFundingAmount(plan, sideToken.address),
      )
      const funding = await verifyNftFunding(provider, plan, deployment.poolAddress)
      const final = await verifyFinalNftLaunch(provider, plan, schedule, deployment.poolAddress)
      console.info('Fork: configuration and deficit funding verified')
      expect(final.checks.filter((check) => check.status === 'BLOCK')).toEqual([])
      const registry = await getNftPoolRegistry(provider, true)
      const discoveredPool = registry.pools.find(
        (item) => item.address.toLowerCase() === deployment.poolAddress.toLowerCase(),
      )
      expect(discoveredPool?.verified).toBe(true)
      expect(discoveredPool?.discoveryStatus).toBe('verified')
      expect(discoveredPool?.publicReadiness?.ready).toBe(true)
      const verifiedPool = discoveredPool && toVerifiedNftPool(discoveredPool)
      expect(verifiedPool).toBeDefined()
      const published = verifiedPool && toPublicV2Pool(verifiedPool, registry.secondsPerBlock)
      expect(published).toBeDefined()
      if (!published) throw new Error('Fresh factory discovery did not produce a public-ready pool projection.')
      console.info('Fork: clean registry discovery proved factory provenance and chain-derived public readiness')
      expect(published.snapshot.threshold).toBe('40')
      expect(published.snapshot.rewards).toHaveLength(2)
      expect(published.snapshot.rewards[0].symbol).toBe('WPOL')
      expect(published.snapshot.rewards[0].balance).toBe(required.toString())
      expect(published.snapshot.rewards[1].balance).toBe(sideFundingAmount(plan, sideToken.address).toString())
      expect(published.snapshot.rewards[1].percentage).toBe(plan.factoryParameters.sideRewardPercentages[0])
      expect(published.snapshot.collections.map((item) => item.weight)).toEqual(['30', '1'])
      expect(published.snapshot.status).toBe('UPCOMING')
      const upcomingCheckpoint = await provider.send('evm_snapshot', [])
      await provider.send('anvil_mine', [`0x${(schedule.startBlock - (await provider.getBlockNumber())).toString(16)}`])
      console.info('Fork: mined to start block')
      const activeRegistry = await getNftPoolRegistry(provider, true)
      expect(
        activeRegistry.pools.find((item) => item.address.toLowerCase() === deployment.poolAddress.toLowerCase())
          ?.status,
      ).toBe('ACTIVE')

      // Exercise the address-native user path against the deployed Polygon factory pool.
      const userAddress = await provider.getSigner(2).getAddress()
      const manualNft = await deployAsset('ManualLaunchNFT')
      const manualTokenId = '900719925474099312345'
      await (await manualNft.mint(userAddress, BigNumber.from(manualTokenId))).wait()
      const manualDiscovery = await readV2OwnedNfts(provider, manualNft.address, userAddress)
      expect(manualDiscovery.method).toBe('manual')
      expect(manualDiscovery.complete).toBe(false)
      const verifiedManualId = await readV2OwnedNfts(provider, manualNft.address, userAddress, {
        manualTokenIds: manualTokenId,
      })
      expect(verifiedManualId.tokenIds).toEqual([manualTokenId])
      await expect(
        readV2OwnedNfts(provider, manualNft.address, userAddress, { manualTokenIds: '777777' }),
      ).rejects.toThrow()
      console.info('Fork: non-enumerable NFT manual-ID fallback verifies uint256 ownership')
      await (await primaryNft.mint(userAddress, 501)).wait()
      await (await primaryNft.mint(userAddress, 502)).wait()
      await (await communityNft.mint(userAddress, 501)).wait()
      await (await communityNft.mint(userAddress, 502)).wait()
      const userSigner = provider.getSigner(userAddress)
      const userContext = {
        signer: userSigner,
        poolAddress: deployment.poolAddress,
        poolRecord: published,
        account: userAddress,
        expectedChainId: 31337,
      }
      const discoveredPrimary = await readV2OwnedNfts(provider, primaryNft.address, userAddress)
      expect(discoveredPrimary.method).toBe('tokensOfOwnerBySize')
      expect(discoveredPrimary.tokenIds).toContain('501')
      await expect(approveV2PoolCollection(userContext, sideToken.address)).rejects.toThrow(
        'This collection is not configured in the verified pool',
      )
      let userPosition = await readV2UserPosition(published, provider, userAddress, { expectedChainId: 31337 })
      expect(userPosition.status).toBe('ACTIVE')
      expect(userPosition.threshold).toBe('40')
      expect(userPosition.nftCount).toBe('0')
      expect(userPosition.performanceFee).toBe('1000000000000000')
      expect(userPosition.feeTo.toLowerCase()).toBe(factoryOwner.toLowerCase())
      await approveV2PoolCollection(userContext, primaryNft.address)
      console.info('Fork: primary NFT collection approval confirmed')
      await approveV2PoolCollection(userContext, communityNft.address)
      console.info('Fork: community NFT collection approval confirmed')
      userPosition = await readV2UserPosition(published, provider, userAddress, { expectedChainId: 31337 })
      const firstBatch = [
        { collectionAddress: primaryNft.address, tokenId: '501' },
        { collectionAddress: communityNft.address, tokenId: '501' },
      ]
      const feeRecipientBeforeStake = await provider.getBalance(factoryOwner)
      await stakeV2Nfts(
        userContext,
        firstBatch,
        await Promise.all([primaryNft.ownerOf(501), communityNft.ownerOf(501)]),
      )
      expect(
        (await provider.getBalance(factoryOwner)).sub(feeRecipientBeforeStake).eq(plan.postDeploy.performanceFee!),
      ).toBe(true)
      userPosition = await readV2UserPosition(published, provider, userAddress, { expectedChainId: 31337 })
      expect(userPosition.nftCount).toBe('2')
      expect(userPosition.power).toBe('31')
      expect(userPosition.remainingCapacity).toBe('0')
      const otherUser = await provider.getSigner(3).getAddress()
      await (await primaryNft.mint(otherUser, 701)).wait()
      const fullPoolPosition = await readV2UserPosition(published, provider, otherUser, { expectedChainId: 31337 })
      expect(fullPoolPosition.capacityAvailable).toBe(false)
      expect(() => assertV2StakeLimits(fullPoolPosition, 1)).toThrow(/capacity/)
      expect(() => assertV2StakeLimits(userPosition, 1)).not.toThrow()
      console.info('Fork: capacity counts wallet entrants; an existing wallet can still stake more')
      expect(
        userPosition.collections.find((item) => item.address.toLowerCase() === primaryNft.address.toLowerCase())
          ?.staked[0].weight,
      ).toBe('30')
      console.info('Fork: two-collection stake verified at 30x + 1x power')

      await provider.send('anvil_mine', ['0xa'])
      userPosition = await readV2UserPosition(published, provider, userAddress, { expectedChainId: 31337 })
      expect(BigNumber.from(userPosition.pendingPrimary).gt(0)).toBe(true)
      const beforeHarvest = userPosition.rewards.map((reward) => BigNumber.from(reward.walletBalance))
      await harvestV2Pool(userContext)
      userPosition = await readV2UserPosition(published, provider, userAddress, { expectedChainId: 31337 })
      expect(BigNumber.from(userPosition.rewards[0].walletBalance).gt(beforeHarvest[0])).toBe(true)
      expect(BigNumber.from(userPosition.rewards[1].walletBalance).gt(beforeHarvest[1])).toBe(true)
      console.info('Fork: primary and 6-decimal side rewards harvested to wallet')

      const stakeMore = [{ collectionAddress: primaryNft.address, tokenId: '502' }]
      await stakeV2Nfts(userContext, stakeMore, [await primaryNft.ownerOf(502)])
      userPosition = await readV2UserPosition(published, provider, userAddress, { expectedChainId: 31337 })
      expect(userPosition.nftCount).toBe('3')
      expect(userPosition.power).toBe('61')
      await unstakeV2Nfts(userContext, [{ collectionAddress: communityNft.address, tokenId: '501' }])
      expect((await communityNft.ownerOf(501)).toLowerCase()).toBe(userAddress.toLowerCase())
      userPosition = await readV2UserPosition(published, provider, userAddress, { expectedChainId: 31337 })
      expect(userPosition.nftCount).toBe('2')
      expect(userPosition.power).toBe('60')
      console.info('Fork: stake-more and partial unstake preserve snapshotted NFT power')

      await provider.send('anvil_mine', ['0x2'])
      userPosition = await readV2UserPosition(published, provider, userAddress, { expectedChainId: 31337 })
      expect(BigNumber.from(userPosition.pendingPrimary).gt(0)).toBe(true)
      const brokenSideBalance = await sideToken.balanceOf(deployment.poolAddress)
      await (await sideToken.burn(deployment.poolAddress, brokenSideBalance)).wait()
      const depletedRegistry = await getNftPoolRegistry(provider, true)
      const depletedPool = depletedRegistry.pools.find(
        (item) => item.address.toLowerCase() === deployment.poolAddress.toLowerCase(),
      )
      expect(depletedPool?.publicReadiness?.ready).toBe(true)
      console.info('Fork: depleted reward balance did not remove public readiness')
      await expect(
        unstakeV2Nfts(userContext, [{ collectionAddress: primaryNft.address, tokenId: '501' }]),
      ).rejects.toThrow()
      expect((await primaryNft.ownerOf(501)).toLowerCase()).toBe(deployment.poolAddress.toLowerCase())
      userPosition = await readV2UserPosition(published, provider, userAddress, { expectedChainId: 31337 })
      expect(userPosition.nftCount).toBe('2')
      console.info('Fork: normal reward-paying withdrawal failed safely when side reward balance was deficient')
      await emergencyWithdrawV2Position(userContext, true)
      expect((await primaryNft.ownerOf(501)).toLowerCase()).toBe(userAddress.toLowerCase())
      expect((await primaryNft.ownerOf(502)).toLowerCase()).toBe(userAddress.toLowerCase())
      userPosition = await readV2UserPosition(published, provider, userAddress, { expectedChainId: 31337 })
      expect(userPosition.nftCount).toBe('0')
      console.info('Fork: explicit emergency withdrawal returns the full position without rewards')

      await (await sideToken.mint(deployment.poolAddress, parseUnits('1000000', 6))).wait()

      await stakeV2Nfts(
        userContext,
        firstBatch,
        await Promise.all([primaryNft.ownerOf(501), communityNft.ownerOf(501)]),
      )
      const untilEnd = schedule.endBlock - (await provider.getBlockNumber())
      if (untilEnd > 0) await provider.send('anvil_mine', [`0x${untilEnd.toString(16)}`])
      userPosition = await readV2UserPosition(published, provider, userAddress, { expectedChainId: 31337 })
      expect(userPosition.status).toBe('FINISHED')
      const finishedRegistry = await getNftPoolRegistry(provider, true)
      const finishedPool = finishedRegistry.pools.find(
        (item) => item.address.toLowerCase() === deployment.poolAddress.toLowerCase(),
      )
      expect(finishedPool?.verified).toBe(true)
      expect(finishedPool?.publicReadiness?.ready).toBe(true)
      expect(finishedPool?.status).toBe('FINISHED')

      const poolAdmin = new Contract(
        deployment.poolAddress,
        ['function setCollectionWeights(address[],uint256[],uint256)'],
        signer,
      )
      let readinessRegressed = false
      try {
        await (await poolAdmin.setCollectionWeights([communityNft.address], [0], 30)).wait()
        readinessRegressed = true
      } catch {
        console.info('Fork: pool contract rejects readiness regression; reader and cache fixtures cover that state')
      }
      if (readinessRegressed) {
        const regressedRegistry = await getNftPoolRegistry(provider, true)
        const regressedPool = regressedRegistry.pools.find(
          (item) => item.address.toLowerCase() === deployment.poolAddress.toLowerCase(),
        )
        expect(regressedPool?.verified).toBe(true)
        expect(regressedPool?.publicReadiness?.ready).toBe(false)
        const recoveryIdentity = regressedPool && toVerifiedNftPool(regressedPool)
        expect(recoveryIdentity).toBeDefined()
        await expect(
          readV2UserPositionSummary(recoveryIdentity!, provider, userAddress, { expectedChainId: 31337 }),
        ).resolves.toMatchObject({ state: 'positive', count: '2', power: '31' })
        const recovered = await readV2UserRecoveryPosition(recoveryIdentity!, provider, userAddress, {
          expectedChainId: 31337,
        })
        expect(recovered.collections.flatMap((collection) => collection.staked).map((item) => item.weight)).toEqual([
          '30',
          '1',
        ])
        await expect(
          stakeV2Nfts(userContext, [{ collectionAddress: primaryNft.address, tokenId: '502' }], [userAddress]),
        ).rejects.toThrow('not public-ready')
        console.info('Fork: readiness regression closed new staking while stored NFT tuples remained recoverable')
      }

      const recoveryNfts = [
        { collectionAddress: primaryNft.address, tokenId: '501' },
        { collectionAddress: communityNft.address, tokenId: '501' },
      ]
      try {
        await unstakeV2Nfts(userContext, recoveryNfts)
        console.info('Fork: finished or readiness-regressed position recovered by normal withdrawal')
      } catch {
        await emergencyWithdrawV2Position(userContext, true)
        console.info('Fork: normal withdrawal unavailable; explicit emergency recovery succeeded')
      }
      expect((await primaryNft.ownerOf(501)).toLowerCase()).toBe(userAddress.toLowerCase())
      expect((await communityNft.ownerOf(501)).toLowerCase()).toBe(userAddress.toLowerCase())
      const zeroSummary = await readV2UserPositionSummary(
        readinessRegressed
          ? toVerifiedNftPool(
              (
                await getNftPoolRegistry(provider, true)
              ).pools.find((item) => item.address.toLowerCase() === deployment.poolAddress.toLowerCase())!,
            )!
          : verifiedPool!,
        provider,
        userAddress,
        { expectedChainId: 31337 },
      )
      expect(zeroSummary).toMatchObject({ state: 'zero', count: '0', power: '0' })
      console.info('Fork: finished-pool withdrawal confirmed; user returned to zero position')

      if (preservePublishedTestPool) {
        const restored = await provider.send('evm_revert', [upcomingCheckpoint])
        if (!restored) throw new Error('Could not restore the discovered pool to its upcoming state.')
        preservedDiscoveredPool = true
        console.info(`COINCOLLECT_FORK_DISCOVERED_POOL=${deployment.poolAddress}`)
        console.info('Fork: verified upcoming pool retained on-chain for clean-browser discovery verification')
      }
    } finally {
      if (owner) await provider.send('anvil_stopImpersonatingAccount', [owner])
      if (!preservedDiscoveredPool) await provider.send('evm_revert', [checkpoint])
    }
  },
  180_000,
)
