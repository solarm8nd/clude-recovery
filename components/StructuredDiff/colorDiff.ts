import { isEnvDefinedFalsy } from '../../utils/envUtils.js'

export type ColorModuleUnavailableReason = 'env'
type SyntaxTheme = unknown
type ColorDiffType = unknown
type ColorFileType = unknown
type NativeColorDiffModule = {
  ColorDiff: ColorDiffType
  ColorFile: ColorFileType
  getSyntaxTheme: (themeName: string) => SyntaxTheme | null
}

function getNativeColorDiffModule(): NativeColorDiffModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('color-diff-napi') as NativeColorDiffModule
  } catch {
    return null
  }
}

/**
 * Returns a static reason why the color-diff module is unavailable, or null if available.
 * 'env' = disabled via CLAUDE_CODE_SYNTAX_HIGHLIGHT
 *
 * The TS port of color-diff works in all build modes, so the only way to
 * disable it is via the env var.
 */
export function getColorModuleUnavailableReason(): ColorModuleUnavailableReason | null {
  if (isEnvDefinedFalsy(process.env.CLAUDE_CODE_SYNTAX_HIGHLIGHT)) {
    return 'env'
  }
  return null
}

export function expectColorDiff(): ColorDiffType | null {
  return getColorModuleUnavailableReason() === null
    ? (getNativeColorDiffModule()?.ColorDiff as ColorDiffType | undefined) ??
        null
    : null
}

export function expectColorFile(): ColorFileType | null {
  return getColorModuleUnavailableReason() === null
    ? (getNativeColorDiffModule()?.ColorFile as ColorFileType | undefined) ??
        null
    : null
}

export function getSyntaxTheme(themeName: string): SyntaxTheme | null {
  return getColorModuleUnavailableReason() === null
    ? getNativeColorDiffModule()?.getSyntaxTheme(themeName) ?? null
    : null
}
