/** @jest-environment node */
import { readFileSync } from 'fs'
import { join } from 'path'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Contract, ContractFactory } from '@ethersproject/contracts'
import { parseEther } from '@ethersproject/units'
import { calculatePoolEconomics } from '../../economics'
import { createEmptyNftPoolDraft } from '../../registry'
import { buildNftPoolDeploymentPlan } from '../../validation'
import { WPOL_ADDRESS } from '../../rewardTokens'
import {
  capturePublicationMetadata,
  hydratePublishedPool,
  PublicV2Pool,
  publishCompletedNftPool,
} from '../../publication'
import { createNftPoolLaunchSession } from '../storage'
import { prepareNftLaunchSchedule } from '../schedule'
import { configureNftCollectionWeights, deployNftPool } from '../transactions'
import { fundNftPoolTokenIfNeeded, primaryFundingAmount, sideFundingAmount } from '../funding'
import {
  verifyDeployedNftPool,
  verifyFinalNftLaunch,
  verifyNftCollectionWeights,
  verifyNftFunding,
} from '../verification'
import { getNftSmartChefFactoryAddress } from 'utils/addressHelpers'

const forkUrl = process.env.COINCOLLECT_FORK_RPC
const forkTest = forkUrl ? it : it.skip

forkTest(
  'uses the real factory and existing engine to deploy, configure, fund, verify and publish on an isolated fork',
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
    expect((await provider.getNetwork()).chainId).toBe(137)
    // This method proves the endpoint is a local Anvil instance before any write.
    await provider.send('anvil_nodeInfo', [])
    const checkpoint = await provider.send('evm_snapshot', [])
    const factoryAddress = getNftSmartChefFactoryAddress(137)!
    let owner: string | undefined
    try {
      owner = await new Contract(factoryAddress, ['function owner() view returns (address)'], provider).owner()
      await provider.send('anvil_impersonateAccount', [owner])
      await provider.send('anvil_setBalance', [owner, '0x3635c9adc5dea00000'])
      const signer = provider.getSigner(owner)
      const compiler = require(process.env.COINCOLLECT_SOLC_MODULE || 'solc')
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
      draft.constraints.participantThreshold = '1'
      draft.constraints.poolCapacity = '100'
      draft.constraints.userLimitEnabled = false
      draft.economics.durationPreset = 'custom'
      draft.economics.customDurationDays = '1'
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
      const plan = buildNftPoolDeploymentPlan(draft, economics, factoryAddress, owner)!
      expect(plan).not.toBeNull()
      const schedule = prepareNftLaunchSchedule(plan, await provider.getBlockNumber(), forkSecondsPerBlock)
      const deployment = await deployNftPool(signer, factoryAddress, plan, schedule)
      console.info('Fork: factory deployment confirmed')
      const deployed = await verifyDeployedNftPool(provider, plan, schedule, deployment.poolAddress)
      expect(deployed.checks.filter((check) => check.status === 'BLOCK')).toEqual([])
      await configureNftCollectionWeights(signer, deployment.poolAddress, plan)
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
      const session = {
        ...createNftPoolLaunchSession(plan, 137, factoryAddress, owner, capturePublicationMetadata(draft)),
        currentStage: 'COMPLETE' as const,
        schedule,
        poolAddress: deployment.poolAddress,
        transactionHashes: { deploy: deployment.transactionHash, sideFunding: {} },
        verification: { deployment: deployed, weights, funding, final },
      }
      let records: PublicV2Pool[] = []
      const store = {
        read: () => records,
        upsert: (record: PublicV2Pool) => {
          records = [record, ...records.filter((item) => item.id !== record.id)]
        },
      }
      const published = await publishCompletedNftPool(session, provider, store)
      console.info('Fork: exact-address publication hydrated')
      await publishCompletedNftPool(session, provider, store)
      expect(records).toHaveLength(1)
      expect(published.snapshot.threshold).toBe('1')
      expect(published.snapshot.rewards).toHaveLength(2)
      expect(published.snapshot.rewards[0].symbol).toBe('WPOL')
      expect(published.snapshot.rewards[0].balance).toBe(required.toString())
      expect(published.snapshot.rewards[1].balance).toBe(sideFundingAmount(plan, sideToken.address).toString())
      expect(published.snapshot.rewards[1].percentage).toBe(plan.factoryParameters.sideRewardPercentages[0])
      expect(published.snapshot.collections.map((item) => item.weight)).toEqual(['30', '1'])
      expect(published.snapshot.status).toBe('UPCOMING')
      await provider.send('anvil_mine', [`0x${(schedule.startBlock - (await provider.getBlockNumber())).toString(16)}`])
      console.info('Fork: mined to start block')
      expect((await hydratePublishedPool(published, provider)).snapshot.status).toBe('ACTIVE')
      await provider.send('anvil_mine', [`0x${(schedule.endBlock - (await provider.getBlockNumber())).toString(16)}`])
      expect((await hydratePublishedPool(published, provider)).snapshot.status).toBe('FINISHED')
    } finally {
      if (owner) await provider.send('anvil_stopImpersonatingAccount', [owner])
      await provider.send('evm_revert', [checkpoint])
    }
  },
  180_000,
)
