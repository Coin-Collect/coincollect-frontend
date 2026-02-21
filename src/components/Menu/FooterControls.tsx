import { Flex, IconButton, VolumeOffIcon, VolumeUpIcon, CogIcon, useModal } from '@pancakeswap/uikit'
import SettingsModal from './GlobalSettings/SettingsModal'
import { useMusic } from 'contexts/MusicContext'

const FooterControls = () => {
  const { isMusicEnabled, toggleMusic } = useMusic()
  const [onPresentSettingsModal] = useModal(<SettingsModal />)

  const MusicIcon = isMusicEnabled ? VolumeUpIcon : VolumeOffIcon

  return (
    <Flex alignItems="center">
      <IconButton
        aria-label={isMusicEnabled ? 'Disable background music' : 'Enable background music'}
        variant="text"
        scale="sm"
        mr="4px"
        onClick={toggleMusic}
        id="toggle-background-music-button"
      >
        <MusicIcon width={24} height={24} color="#F4EEFF" />
      </IconButton>
      <IconButton
        aria-label="Open settings"
        variant="text"
        scale="sm"
        mr="4px"
        onClick={onPresentSettingsModal}
        id="open-settings-dialog-button-sidebar"
      >
        <CogIcon width={24} height={24} color="#F4EEFF" />
      </IconButton>
    </Flex>
  )
}

export default FooterControls
