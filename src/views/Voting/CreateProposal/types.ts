import { Choice } from './Choices'

export interface FormState {
  name: string
  body: string
  choices: Choice[]
  startDate: Date | null
  startTime: Date | null
  endDate: Date | null
  endTime: Date | null
  snapshot: number
}
