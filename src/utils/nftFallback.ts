const FALLBACK_IMAGE_BASE_PATH = '/images/collectHeroes'
const FALLBACK_IMAGE_COUNT = 38

const buildFallbackSrc = (index: number) => `${FALLBACK_IMAGE_BASE_PATH}/${index}.jpg`

export const getRandomNftFallbackSrc = (exclude?: string): string => {
  let candidate = exclude

  for (let attempt = 0; attempt < FALLBACK_IMAGE_COUNT; attempt += 1) {
    const index = Math.floor(Math.random() * FALLBACK_IMAGE_COUNT) + 1
    candidate = buildFallbackSrc(index)

    if (!exclude || candidate !== exclude) {
      return candidate
    }
  }

  return buildFallbackSrc(1)
}

export const nftFallbackConstants = {
  basePath: FALLBACK_IMAGE_BASE_PATH,
  count: FALLBACK_IMAGE_COUNT,
}

