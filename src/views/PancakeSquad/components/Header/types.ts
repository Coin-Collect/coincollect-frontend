import { EventInfos, UserInfos, UserStatusEnum } from 'views/PancakeSquad/types'

export type PancakeSquadHeaderType = {
  account?: string | null
  isLoading: boolean
  eventInfos?: EventInfos
  userInfos?: UserInfos
  userStatus: UserStatusEnum
}

export enum ButtonsEnum {
  ACTIVATE,
  BUY,
  MINT,
  END,
  NONE,
}
