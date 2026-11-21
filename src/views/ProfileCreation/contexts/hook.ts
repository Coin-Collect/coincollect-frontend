import { useContext } from 'react'
import { ProfileCreationContext } from './ProfileCreationProvider'

const useProfileCreation = () => {
  const context = useContext(ProfileCreationContext)
  if (!context) throw new Error('Profile creation requires its provider')
  return context
}

export default useProfileCreation
