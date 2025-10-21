/**
 * Returns a random superhero video path from the available 9 videos
 * @returns {string} Path to a random superhero video
 */
export const getRandomSuperheroVideo = (): string => {
  const videoCount = 9
  const randomIndex = Math.floor(Math.random() * videoCount) + 1
  return `/images/superheroes/${randomIndex}.webm`
}

/**
 * Returns multiple unique random superhero videos
 * @param count Number of unique videos to return
 * @returns {string[]} Array of unique video paths
 */
export const getRandomSuperheroVideos = (count: number): string[] => {
  const videoCount = 9
  const availableIndices = Array.from({ length: videoCount }, (_, i) => i + 1)
  const selectedVideos: string[] = []
  
  for (let i = 0; i < Math.min(count, videoCount); i++) {
    const randomIndex = Math.floor(Math.random() * availableIndices.length)
    const videoIndex = availableIndices.splice(randomIndex, 1)[0]
    selectedVideos.push(`/images/superheroes/${videoIndex}.webm`)
  }
  
  return selectedVideos
}