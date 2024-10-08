/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
} from "./common";

export interface EasterNftInterface extends utils.Interface {
  functions: {
    "addBunny(uint8,uint256,string)": FunctionFragment;
    "bunnyMintingStation()": FunctionFragment;
    "bunnyTokenURI(uint8)": FunctionFragment;
    "cakeToken()": FunctionFragment;
    "canClaim(address)": FunctionFragment;
    "changeEndBlock(uint256)": FunctionFragment;
    "endBlock()": FunctionFragment;
    "hasClaimed(address)": FunctionFragment;
    "mintNFT()": FunctionFragment;
    "owner()": FunctionFragment;
    "pancakeProfile()": FunctionFragment;
    "previousNumberBunnyIds()": FunctionFragment;
    "renounceOwnership()": FunctionFragment;
    "teamIdToBunnyId(uint256)": FunctionFragment;
    "thresholdUser()": FunctionFragment;
    "transferOwnership(address)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "addBunny"
      | "bunnyMintingStation"
      | "bunnyTokenURI"
      | "cakeToken"
      | "canClaim"
      | "changeEndBlock"
      | "endBlock"
      | "hasClaimed"
      | "mintNFT"
      | "owner"
      | "pancakeProfile"
      | "previousNumberBunnyIds"
      | "renounceOwnership"
      | "teamIdToBunnyId"
      | "thresholdUser"
      | "transferOwnership"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "addBunny",
    values: [BigNumberish, BigNumberish, string]
  ): string;
  encodeFunctionData(
    functionFragment: "bunnyMintingStation",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "bunnyTokenURI",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "cakeToken", values?: undefined): string;
  encodeFunctionData(functionFragment: "canClaim", values: [string]): string;
  encodeFunctionData(
    functionFragment: "changeEndBlock",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "endBlock", values?: undefined): string;
  encodeFunctionData(functionFragment: "hasClaimed", values: [string]): string;
  encodeFunctionData(functionFragment: "mintNFT", values?: undefined): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "pancakeProfile",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "previousNumberBunnyIds",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "renounceOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "teamIdToBunnyId",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "thresholdUser",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [string]
  ): string;

  decodeFunctionResult(functionFragment: "addBunny", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "bunnyMintingStation",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "bunnyTokenURI",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "cakeToken", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "canClaim", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "changeEndBlock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "endBlock", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "hasClaimed", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "mintNFT", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "pancakeProfile",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "previousNumberBunnyIds",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "renounceOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "teamIdToBunnyId",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "thresholdUser",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;

  events: {
    "BunnyAdd(uint8,uint256)": EventFragment;
    "BunnyMint(address,uint256,uint8)": EventFragment;
    "NewEndBlock(uint256)": EventFragment;
    "OwnershipTransferred(address,address)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "BunnyAdd"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "BunnyMint"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "NewEndBlock"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "OwnershipTransferred"): EventFragment;
}

export interface BunnyAddEventObject {
  bunnyId: number;
  teamId: BigNumber;
}
export type BunnyAddEvent = TypedEvent<
  [number, BigNumber],
  BunnyAddEventObject
>;

export type BunnyAddEventFilter = TypedEventFilter<BunnyAddEvent>;

export interface BunnyMintEventObject {
  to: string;
  tokenId: BigNumber;
  bunnyId: number;
}
export type BunnyMintEvent = TypedEvent<
  [string, BigNumber, number],
  BunnyMintEventObject
>;

export type BunnyMintEventFilter = TypedEventFilter<BunnyMintEvent>;

export interface NewEndBlockEventObject {
  endBlock: BigNumber;
}
export type NewEndBlockEvent = TypedEvent<[BigNumber], NewEndBlockEventObject>;

export type NewEndBlockEventFilter = TypedEventFilter<NewEndBlockEvent>;

export interface OwnershipTransferredEventObject {
  previousOwner: string;
  newOwner: string;
}
export type OwnershipTransferredEvent = TypedEvent<
  [string, string],
  OwnershipTransferredEventObject
>;

export type OwnershipTransferredEventFilter =
  TypedEventFilter<OwnershipTransferredEvent>;

export interface EasterNft extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: EasterNftInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    addBunny(
      _bunnyId: BigNumberish,
      _teamId: BigNumberish,
      _tokenURI: string,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    bunnyMintingStation(overrides?: CallOverrides): Promise<[string]>;

    bunnyTokenURI(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[string]>;

    cakeToken(overrides?: CallOverrides): Promise<[string]>;

    canClaim(
      _userAddress: string,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    changeEndBlock(
      _endBlock: BigNumberish,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    endBlock(overrides?: CallOverrides): Promise<[BigNumber]>;

    hasClaimed(arg0: string, overrides?: CallOverrides): Promise<[boolean]>;

    mintNFT(
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    owner(overrides?: CallOverrides): Promise<[string]>;

    pancakeProfile(overrides?: CallOverrides): Promise<[string]>;

    previousNumberBunnyIds(overrides?: CallOverrides): Promise<[number]>;

    renounceOwnership(
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    teamIdToBunnyId(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[number]>;

    thresholdUser(overrides?: CallOverrides): Promise<[BigNumber]>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;
  };

  addBunny(
    _bunnyId: BigNumberish,
    _teamId: BigNumberish,
    _tokenURI: string,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  bunnyMintingStation(overrides?: CallOverrides): Promise<string>;

  bunnyTokenURI(arg0: BigNumberish, overrides?: CallOverrides): Promise<string>;

  cakeToken(overrides?: CallOverrides): Promise<string>;

  canClaim(_userAddress: string, overrides?: CallOverrides): Promise<boolean>;

  changeEndBlock(
    _endBlock: BigNumberish,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  endBlock(overrides?: CallOverrides): Promise<BigNumber>;

  hasClaimed(arg0: string, overrides?: CallOverrides): Promise<boolean>;

  mintNFT(
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  owner(overrides?: CallOverrides): Promise<string>;

  pancakeProfile(overrides?: CallOverrides): Promise<string>;

  previousNumberBunnyIds(overrides?: CallOverrides): Promise<number>;

  renounceOwnership(
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  teamIdToBunnyId(
    arg0: BigNumberish,
    overrides?: CallOverrides
  ): Promise<number>;

  thresholdUser(overrides?: CallOverrides): Promise<BigNumber>;

  transferOwnership(
    newOwner: string,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  callStatic: {
    addBunny(
      _bunnyId: BigNumberish,
      _teamId: BigNumberish,
      _tokenURI: string,
      overrides?: CallOverrides
    ): Promise<void>;

    bunnyMintingStation(overrides?: CallOverrides): Promise<string>;

    bunnyTokenURI(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<string>;

    cakeToken(overrides?: CallOverrides): Promise<string>;

    canClaim(_userAddress: string, overrides?: CallOverrides): Promise<boolean>;

    changeEndBlock(
      _endBlock: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    endBlock(overrides?: CallOverrides): Promise<BigNumber>;

    hasClaimed(arg0: string, overrides?: CallOverrides): Promise<boolean>;

    mintNFT(overrides?: CallOverrides): Promise<void>;

    owner(overrides?: CallOverrides): Promise<string>;

    pancakeProfile(overrides?: CallOverrides): Promise<string>;

    previousNumberBunnyIds(overrides?: CallOverrides): Promise<number>;

    renounceOwnership(overrides?: CallOverrides): Promise<void>;

    teamIdToBunnyId(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<number>;

    thresholdUser(overrides?: CallOverrides): Promise<BigNumber>;

    transferOwnership(
      newOwner: string,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "BunnyAdd(uint8,uint256)"(
      bunnyId?: null,
      teamId?: null
    ): BunnyAddEventFilter;
    BunnyAdd(bunnyId?: null, teamId?: null): BunnyAddEventFilter;

    "BunnyMint(address,uint256,uint8)"(
      to?: string | null,
      tokenId?: BigNumberish | null,
      bunnyId?: BigNumberish | null
    ): BunnyMintEventFilter;
    BunnyMint(
      to?: string | null,
      tokenId?: BigNumberish | null,
      bunnyId?: BigNumberish | null
    ): BunnyMintEventFilter;

    "NewEndBlock(uint256)"(endBlock?: null): NewEndBlockEventFilter;
    NewEndBlock(endBlock?: null): NewEndBlockEventFilter;

    "OwnershipTransferred(address,address)"(
      previousOwner?: string | null,
      newOwner?: string | null
    ): OwnershipTransferredEventFilter;
    OwnershipTransferred(
      previousOwner?: string | null,
      newOwner?: string | null
    ): OwnershipTransferredEventFilter;
  };

  estimateGas: {
    addBunny(
      _bunnyId: BigNumberish,
      _teamId: BigNumberish,
      _tokenURI: string,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    bunnyMintingStation(overrides?: CallOverrides): Promise<BigNumber>;

    bunnyTokenURI(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    cakeToken(overrides?: CallOverrides): Promise<BigNumber>;

    canClaim(
      _userAddress: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    changeEndBlock(
      _endBlock: BigNumberish,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    endBlock(overrides?: CallOverrides): Promise<BigNumber>;

    hasClaimed(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    mintNFT(overrides?: Overrides & { from?: string }): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<BigNumber>;

    pancakeProfile(overrides?: CallOverrides): Promise<BigNumber>;

    previousNumberBunnyIds(overrides?: CallOverrides): Promise<BigNumber>;

    renounceOwnership(
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    teamIdToBunnyId(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    thresholdUser(overrides?: CallOverrides): Promise<BigNumber>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    addBunny(
      _bunnyId: BigNumberish,
      _teamId: BigNumberish,
      _tokenURI: string,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    bunnyMintingStation(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    bunnyTokenURI(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    cakeToken(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    canClaim(
      _userAddress: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    changeEndBlock(
      _endBlock: BigNumberish,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    endBlock(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    hasClaimed(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    mintNFT(
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    pancakeProfile(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    previousNumberBunnyIds(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    renounceOwnership(
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    teamIdToBunnyId(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    thresholdUser(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;
  };
}
