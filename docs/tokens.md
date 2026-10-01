# 토큰 표

> **손으로 고치지 않는다.** `npm run tokens:doc` 이 아래 CSS 에서 만든다(`scripts/lib/tokenDoc.ts`).
> 규칙과 고르는 법은 [디자인 시스템 명세](./design-system.md). 여기는 값만 있다.
> 토큰을 바꾸고 표를 다시 만들지 않으면 `tokenDoc.test.ts` 가 실패한다.

## `src/styles/tokens/_color.css`

토큰 119개

| 토큰 | 값 | 다크 |
|---|---|---|
| `--color-accent` | `oklch(55.20% 0.2249 4.81)` | `oklch(69.42% 0.2264 354.05)` |
| `--color-accent-dark` | `oklch(46.13% 0.1859 3.15)` | `oklch(62.91% 0.2180 356.45)` |
| `--color-accent-light` | `oklch(69.31% 0.2206 357.47)` | `oklch(76.26% 0.1700 349.46)` |
| `--color-neutral-0` | `oklch(100.00% 0.0000 0.00)` | `oklch(0.00% 0.0000 0.00)` |
| `--color-neutral-50` | `oklch(97.30% 0.0082 91.48)` | `oklch(21.81% 0.0041 84.59)` |
| `--color-neutral-100` | `oklch(94.52% 0.0081 98.88)` | `oklch(25.65% 0.0040 84.58)` |
| `--color-neutral-200` | `oklch(90.25% 0.0095 100.00)` | `oklch(33.28% 0.0054 91.54)` |
| `--color-neutral-300` | `oklch(83.44% 0.0110 100.86)` | `oklch(42.66% 0.0098 99.08)` |
| `--color-neutral-400` | `oklch(75.89% 0.0113 100.88)` | `oklch(52.77% 0.0095 91.56)` |
| `--color-neutral-500` | `oklch(67.27% 0.0104 93.62)` | `oklch(67.27% 0.0104 93.62)` |
| `--color-neutral-600` | `oklch(52.77% 0.0095 91.56)` | `oklch(75.89% 0.0113 100.88)` |
| `--color-neutral-700` | `oklch(42.66% 0.0098 99.08)` | `oklch(83.44% 0.0110 100.86)` |
| `--color-neutral-800` | `oklch(33.28% 0.0054 91.54)` | `oklch(90.25% 0.0095 100.00)` |
| `--color-neutral-900` | `oklch(25.65% 0.0040 84.58)` | `oklch(94.52% 0.0081 98.88)` |
| `--color-neutral-950` | `oklch(21.81% 0.0041 84.59)` | `oklch(97.30% 0.0082 91.48)` |
| `--color-neutral-999` | `oklch(0.00% 0.0000 0.00)` | `oklch(100.00% 0.0000 0.00)` |
| `--color-scheme-light-bg` | `oklch(97.30% 0.0082 91.48)` |  |
| `--color-scheme-dark-bg` | `oklch(21.81% 0.0041 84.59)` |  |
| `--color-cursor-trail` | `oklch(62.31% 0.1880 259.81)` | `oklch(71.37% 0.1434 254.62)` |
| `--color-success` | `oklch(62.71% 0.1699 149.21)` | `oklch(80.03% 0.1821 151.71)` |
| `--color-success-alpha` | `oklch(72.27% 0.1920 149.58 / 0.6)` | `oklch(72.27% 0.1920 149.58 / 0.3)` |
| `--color-success-alpha-40` | `oklch(62.71% 0.1699 149.21 / 0.4)` | `oklch(80.03% 0.1821 151.71 / 0.4)` |
| `--color-success-alpha-60` | `oklch(62.71% 0.1699 149.21 / 0.6)` | `oklch(80.03% 0.1821 151.71 / 0.6)` |
| `--color-success-soft` | `oklch(62.71% 0.1699 149.21 / 0.12)` | `oklch(80.03% 0.1821 151.71 / 0.18)` |
| `--color-warning` | `oklch(72% 0.15 75)` | `oklch(78% 0.15 76)` |
| `--color-warning-alpha` | `oklch(72% 0.15 75 / 0.6)` | `oklch(78% 0.15 76 / 0.5)` |
| `--color-warning-alpha-40` | `oklch(72% 0.15 75 / 0.4)` | `oklch(78% 0.15 76 / 0.4)` |
| `--color-warning-soft` | `oklch(72% 0.15 75 / 0.12)` | `oklch(78% 0.15 76 / 0.18)` |
| `--color-info` | `oklch(54.61% 0.2152 262.88)` | `oklch(71.37% 0.1434 254.62)` |
| `--color-info-alpha` | `oklch(54.61% 0.2152 262.88 / 0.6)` | `oklch(71.37% 0.1434 254.62 / 0.5)` |
| `--color-info-soft` | `oklch(54.61% 0.2152 262.88 / 0.12)` | `oklch(71.37% 0.1434 254.62 / 0.18)` |
| `--color-error` | `oklch(57.71% 0.2152 27.33)` | `oklch(71.06% 0.1661 22.22)` |
| `--color-error-alpha` | `oklch(57.71% 0.2152 27.33 / 0.15)` | `oklch(71.06% 0.1661 22.22 / 0.2)` |
| `--color-error-soft` | `oklch(57.71% 0.2152 27.33 / 0.12)` | `oklch(71.06% 0.1661 22.22 / 0.18)` |
| `--color-success-strong` | `oklch(50.07% 0.1699 149.21)` | `var(--color-success)` |
| `--color-warning-strong` | `oklch(52.95% 0.15 75)` | `var(--color-warning)` |
| `--color-info-strong` | `oklch(53.63% 0.2152 262.88)` | `var(--color-info)` |
| `--color-error-strong` | `oklch(55.10% 0.2152 27.33)` | `var(--color-error)` |
| `--color-label-red` | `oklch(57.71% 0.2152 27.33)` |  |
| `--color-label-orange` | `oklch(66% 0.18 55)` |  |
| `--color-label-yellow` | `oklch(79% 0.15 90)` |  |
| `--color-label-green` | `oklch(62.71% 0.1699 149.21)` |  |
| `--color-label-blue` | `oklch(54.61% 0.2152 262.88)` |  |
| `--color-label-indigo` | `oklch(49% 0.19 279)` |  |
| `--color-label-violet` | `oklch(55% 0.2 320)` |  |
| `--color-accent-alpha-1` | `oklch(55.96% 0.2249 4.81 / 0.015)` | `oklch(69.42% 0.2264 354.05 / 0.015)` |
| `--color-accent-alpha-5` | `oklch(55.96% 0.2249 4.81 / 0.05)` | `oklch(69.42% 0.2264 354.05 / 0.05)` |
| `--color-accent-alpha-10` | `oklch(55.96% 0.2249 4.81 / 0.1)` | `oklch(69.42% 0.2264 354.05 / 0.1)` |
| `--color-accent-alpha-15` | `oklch(55.96% 0.2249 4.81 / 0.15)` | `oklch(69.42% 0.2264 354.05 / 0.15)` |
| `--color-accent-alpha-20` | `oklch(55.96% 0.2249 4.81 / 0.2)` | `oklch(69.42% 0.2264 354.05 / 0.2)` |
| `--color-accent-alpha-30` | `oklch(55.96% 0.2249 4.81 / 0.3)` | `oklch(69.42% 0.2264 354.05 / 0.3)` |
| `--color-accent-alpha-50` | `oklch(55.96% 0.2249 4.81 / 0.5)` | `oklch(69.42% 0.2264 354.05 / 0.5)` |
| `--color-accent-alpha-70` | `oklch(55.96% 0.2249 4.81 / 0.7)` | `oklch(69.42% 0.2264 354.05 / 0.7)` |
| `--color-accent-alpha-80` | `oklch(55.96% 0.2249 4.81 / 0.8)` | `oklch(69.42% 0.2264 354.05 / 0.8)` |
| `--color-accent-alpha-90` | `oklch(55.96% 0.2249 4.81 / 0.9)` | `oklch(69.42% 0.2264 354.05 / 0.9)` |
| `--color-accent-alpha-95` | `oklch(55.96% 0.2249 4.81 / 0.95)` | `oklch(69.42% 0.2264 354.05 / 0.95)` |
| `--color-accent-alpha-100` | `oklch(55.96% 0.2249 4.81)` | `oklch(69.42% 0.2264 354.05)` |
| `--color-accent-light-alpha-40` | `oklch(69.31% 0.2206 357.47 / 0.4)` | `oklch(76.26% 0.1700 349.46 / 0.4)` |
| `--color-accent-light-alpha-60` | `oklch(69.31% 0.2206 357.47 / 0.6)` | `oklch(76.26% 0.1700 349.46 / 0.6)` |
| `--color-accent-light-alpha-70` | `oklch(69.31% 0.2206 357.47 / 0.7)` | `oklch(76.26% 0.1700 349.46 / 0.7)` |
| `--color-accent-light-alpha-90` | `oklch(69.31% 0.2206 357.47 / 0.9)` | `oklch(76.26% 0.1700 349.46 / 0.9)` |
| `--color-neutral-alpha-1` | `oklch(21.81% 0.0041 84.59 / 0.015)` | `oklch(97.30% 0.0082 91.48 / 0.015)` |
| `--color-neutral-alpha-5` | `oklch(21.81% 0.0041 84.59 / 0.05)` | `oklch(97.30% 0.0082 91.48 / 0.05)` |
| `--color-neutral-alpha-10` | `oklch(21.81% 0.0041 84.59 / 0.1)` | `oklch(97.30% 0.0082 91.48 / 0.1)` |
| `--color-neutral-alpha-20` | `oklch(21.81% 0.0041 84.59 / 0.2)` | `oklch(97.30% 0.0082 91.48 / 0.2)` |
| `--color-neutral-alpha-30` | `oklch(21.81% 0.0041 84.59 / 0.3)` | `oklch(97.30% 0.0082 91.48 / 0.3)` |
| `--color-neutral-alpha-40` | `oklch(21.81% 0.0041 84.59 / 0.4)` | `oklch(97.30% 0.0082 91.48 / 0.4)` |
| `--color-neutral-alpha-50` | `oklch(21.81% 0.0041 84.59 / 0.5)` | `oklch(97.30% 0.0082 91.48 / 0.5)` |
| `--color-neutral-alpha-60` | `oklch(21.81% 0.0041 84.59 / 0.6)` | `oklch(97.30% 0.0082 91.48 / 0.6)` |
| `--color-neutral-alpha-70` | `oklch(21.81% 0.0041 84.59 / 0.7)` | `oklch(97.30% 0.0082 91.48 / 0.7)` |
| `--color-neutral-alpha-80` | `oklch(21.81% 0.0041 84.59 / 0.8)` | `oklch(97.30% 0.0082 91.48 / 0.8)` |
| `--color-neutral-alpha-90` | `oklch(21.81% 0.0041 84.59 / 0.9)` | `oklch(97.30% 0.0082 91.48 / 0.9)` |
| `--color-neutral-alpha-95` | `oklch(21.81% 0.0041 84.59 / 0.95)` | `oklch(97.30% 0.0082 91.48 / 0.95)` |
| `--color-neutral-alpha-100` | `oklch(21.81% 0.0041 84.59)` | `oklch(97.30% 0.0082 91.48)` |
| `--color-inverse-alpha-1` | `oklch(97.30% 0.0082 91.48 / 0.015)` | `oklch(21.81% 0.0041 84.59 / 0.015)` |
| `--color-inverse-alpha-5` | `oklch(97.30% 0.0082 91.48 / 0.05)` | `oklch(21.81% 0.0041 84.59 / 0.05)` |
| `--color-inverse-alpha-10` | `oklch(97.30% 0.0082 91.48 / 0.1)` | `oklch(21.81% 0.0041 84.59 / 0.1)` |
| `--color-inverse-alpha-20` | `oklch(97.30% 0.0082 91.48 / 0.2)` | `oklch(21.81% 0.0041 84.59 / 0.2)` |
| `--color-inverse-alpha-30` | `oklch(97.30% 0.0082 91.48 / 0.3)` | `oklch(21.81% 0.0041 84.59 / 0.3)` |
| `--color-inverse-alpha-40` | `oklch(97.30% 0.0082 91.48 / 0.4)` | `oklch(21.81% 0.0041 84.59 / 0.4)` |
| `--color-inverse-alpha-50` | `oklch(97.30% 0.0082 91.48 / 0.5)` | `oklch(21.81% 0.0041 84.59 / 0.5)` |
| `--color-inverse-alpha-60` | `oklch(97.30% 0.0082 91.48 / 0.6)` | `oklch(21.81% 0.0041 84.59 / 0.6)` |
| `--color-inverse-alpha-70` | `oklch(97.30% 0.0082 91.48 / 0.7)` | `oklch(21.81% 0.0041 84.59 / 0.7)` |
| `--color-inverse-alpha-80` | `oklch(97.30% 0.0082 91.48 / 0.8)` | `oklch(21.81% 0.0041 84.59 / 0.8)` |
| `--color-inverse-alpha-90` | `oklch(97.30% 0.0082 91.48 / 0.9)` | `oklch(21.81% 0.0041 84.59 / 0.9)` |
| `--color-inverse-alpha-95` | `oklch(97.30% 0.0082 91.48 / 0.95)` | `oklch(21.81% 0.0041 84.59 / 0.95)` |
| `--color-inverse-alpha-100` | `oklch(97.30% 0.0082 91.48)` | `oklch(21.81% 0.0041 84.59)` |
| `--color-gray-alpha-1` | `oklch(0.00% 0.0000 0.00 / 0.015)` |  |
| `--color-gray-alpha-5` | `oklch(0.00% 0.0000 0.00 / 0.05)` |  |
| `--color-gray-alpha-10` | `oklch(0.00% 0.0000 0.00 / 0.1)` |  |
| `--color-gray-alpha-20` | `oklch(0.00% 0.0000 0.00 / 0.2)` |  |
| `--color-gray-alpha-25` | `oklch(0.00% 0.0000 0.00 / 0.25)` |  |
| `--color-gray-alpha-30` | `oklch(0.00% 0.0000 0.00 / 0.3)` |  |
| `--color-gray-alpha-40` | `oklch(0.00% 0.0000 0.00 / 0.4)` |  |
| `--color-gray-alpha-50` | `oklch(0.00% 0.0000 0.00 / 0.5)` |  |
| `--color-gray-alpha-60` | `oklch(0.00% 0.0000 0.00 / 0.6)` |  |
| `--color-gray-alpha-70` | `oklch(0.00% 0.0000 0.00 / 0.7)` |  |
| `--color-gray-alpha-80` | `oklch(0.00% 0.0000 0.00 / 0.8)` |  |
| `--color-gray-alpha-90` | `oklch(0.00% 0.0000 0.00 / 0.9)` |  |
| `--color-gray-alpha-95` | `oklch(0.00% 0.0000 0.00 / 0.95)` |  |
| `--color-gray-alpha-100` | `oklch(0.00% 0.0000 0.00)` |  |
| `--color-white-alpha-1` | `oklch(100.00% 0.0000 0.00 / 0.015)` |  |
| `--color-white-alpha-5` | `oklch(100.00% 0.0000 0.00 / 0.05)` |  |
| `--color-white-alpha-10` | `oklch(100.00% 0.0000 0.00 / 0.1)` |  |
| `--color-white-alpha-20` | `oklch(100.00% 0.0000 0.00 / 0.2)` |  |
| `--color-white-alpha-30` | `oklch(100.00% 0.0000 0.00 / 0.3)` |  |
| `--color-white-alpha-40` | `oklch(100.00% 0.0000 0.00 / 0.4)` |  |
| `--color-white-alpha-50` | `oklch(100.00% 0.0000 0.00 / 0.5)` |  |
| `--color-white-alpha-60` | `oklch(100.00% 0.0000 0.00 / 0.6)` |  |
| `--color-white-alpha-70` | `oklch(100.00% 0.0000 0.00 / 0.7)` |  |
| `--color-white-alpha-80` | `oklch(100.00% 0.0000 0.00 / 0.8)` |  |
| `--color-white-alpha-90` | `oklch(100.00% 0.0000 0.00 / 0.9)` |  |
| `--color-white-alpha-95` | `oklch(100.00% 0.0000 0.00 / 0.95)` |  |
| `--color-white-alpha-100` | `oklch(100.00% 0.0000 0.00)` |  |
| `--gradient-accent` | `linear-gradient(135deg, var(--color-accent-light), var(--color-accent-dark))` |  |
| `--gradient-accent-soft` | `linear-gradient(135deg, var(--color-accent-light), var(--color-accent))` |  |
| `--gradient-neutral` | `linear-gradient(135deg, var(--color-neutral-300), var(--color-neutral-700))` |  |
| `--color-accent-alpha-40` | — | `oklch(69.42% 0.2264 354.05 / 0.4)` |
| `--color-accent-alpha-60` | — | `oklch(69.42% 0.2264 354.05 / 0.6)` |

## `src/styles/tokens/_spacing.css`

토큰 17개

| 토큰 | 값 |
|---|---|
| `--spacing-zero` | `0` |
| `--spacing-4xs` | `1px` |
| `--spacing-3xs` | `0.125rem` |
| `--spacing-2xs` | `0.25rem` |
| `--spacing-xs` | `0.5rem` |
| `--spacing-sm` | `0.75rem` |
| `--spacing-md` | `1rem` |
| `--spacing-lg` | `1.25rem` |
| `--spacing-xl` | `1.5rem` |
| `--spacing-2xl` | `2rem` |
| `--spacing-2xl-plus` | `2.5rem` |
| `--spacing-3xl` | `3rem` |
| `--spacing-4xl` | `4rem` |
| `--spacing-4xl-plus` | `5rem` |
| `--spacing-5xl` | `6rem` |
| `--spacing-5xl-plus` | `7rem` |
| `--spacing-6xl` | `8rem` |

## `src/styles/tokens/_typography.css`

토큰 52개

| 토큰 | 값 |
|---|---|
| `--font-sans` | `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Pretendard Variable", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"` |
| `--font-serif` | `"Playfair Display", Georgia, Cambria, "Times New Roman", Times, var(--font-noto-serif-kr), serif` |
| `--font-mono` | `var(--font-jetbrains), SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", "Pretendard Variable", monospace` |
| `--font-playfair` | `var(--font-playfair-latin), var(--font-noto-serif-kr), serif` |
| `--font-space-grotesk` | `var(--font-space-grotesk-latin), "Pretendard Variable", sans-serif` |
| `--font-instrument` | `var(--font-instrument-latin), var(--font-noto-serif-kr), serif` |
| `--font-display` | `var(--font-playfair)` |
| `--font-grotesk` | `var(--font-space-grotesk), sans-serif` |
| `--font-size-3xs` | `0.6875rem` |
| `--font-size-2xs` | `0.75rem` |
| `--font-size-xs` | `0.8125rem` |
| `--font-size-sm` | `0.875rem` |
| `--font-size-md` | `1rem` |
| `--font-size-lg` | `1.125rem` |
| `--font-size-xl` | `1.25rem` |
| `--font-size-2xl` | `1.5rem` |
| `--font-size-2xl-plus` | `1.75rem` |
| `--font-size-3xl` | `2rem` |
| `--font-size-4xl` | `2.5rem` |
| `--font-size-5xl` | `3rem` |
| `--font-size-6xl` | `4rem` |
| `--fluid-font-size-2xs` | `clamp(0.75rem, 0.6rem + 0.15vw, 0.75rem)` |
| `--fluid-font-size-xs` | `clamp(0.75rem, 0.7rem + 0.2vw, 0.9rem)` |
| `--fluid-font-size-sm` | `clamp(0.75rem, 0.83rem + 0.25vw, 1rem)` |
| `--fluid-font-size-md` | `clamp(0.75rem, 0.95rem + 0.3vw, 1.125rem)` |
| `--fluid-font-size-lg` | `clamp(0.75rem, 1.05rem + 0.35vw, 1.375rem)` |
| `--fluid-font-size-xl` | `clamp(0.75rem, 1.15rem + 0.5vw, 1.5rem)` |
| `--fluid-font-size-2xl` | `clamp(0.75rem, 1.4rem + 0.75vw, 2rem)` |
| `--fluid-font-size-3xl` | `clamp(0.75rem, 1.8rem + 1vw, 2.5rem)` |
| `--fluid-font-size-4xl` | `clamp(0.75rem, 3rem + 1.5vw, 5rem)` |
| `--fluid-font-size-5xl` | `clamp(0.75rem, 4.5rem + 2vw, 8rem)` |
| `--fluid-font-size-6xl` | `clamp(0.75rem, 6rem + 2.5vw, 10rem)` |
| `--fluid-font-size-7xl` | `clamp(0.75rem, 7.5rem + 3vw, 12rem)` |
| `--fluid-font-size-8xl` | `clamp(0.75rem, 9rem + 3.5vw, 14rem)` |
| `--fluid-font-size-9xl` | `clamp(0.75rem, 10.5rem + 4vw, 16rem)` |
| `--fluid-font-size-10xl` | `clamp(0.75rem, 12rem + 4.5vw, 18rem)` |
| `--line-height-dense` | `0.9` |
| `--line-height-fit` | `1` |
| `--line-height-compact` | `1.125` |
| `--line-height-tight` | `1.25` |
| `--line-height-snug` | `1.35` |
| `--line-height-normal` | `1.6` |
| `--line-height-relaxed` | `1.65` |
| `--line-height-loose` | `1.8` |
| `--font-weight-light` | `300` |
| `--font-weight-regular` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |
| `--font-weight-extrabold` | `800` |
| `--font-weight-black` | `900` |
| `--letter-spacing-tight` | `-0.03em` |

## `src/styles/tokens/_sizing.css`

토큰 52개

| 토큰 | 값 | 조건부 |
|---|---|---|
| `--pc` | `1025px` |  |
| `--tablet` | `768px` |  |
| `--mobile` | `378px` |  |
| `--width-6xs` | `180px` |  |
| `--width-5xs` | `240px` |  |
| `--width-4xs` | `280px` |  |
| `--width-3xs` | `320px` |  |
| `--width-2xs` | `360px` |  |
| `--width-xs` | `480px` |  |
| `--width-sm` | `540px` |  |
| `--width-md` | `720px` |  |
| `--width-lg` | `960px` |  |
| `--width-xl` | `1140px` |  |
| `--width-2xl` | `1320px` |  |
| `--width-3xl` | `1600px` |  |
| `--width-4xl` | `1920px` |  |
| `--width-5xl` | `2160px` |  |
| `--width-6xl` | `2400px` |  |
| `--width-full` | `100%` |  |
| `--grid-cols-2` | `repeat(2, minmax(0, 1fr))` |  |
| `--grid-cols-3` | `repeat(3, minmax(0, 1fr))` |  |
| `--grid-cols-4` | `repeat(4, minmax(0, 1fr))` |  |
| `--grid-cols-5` | `repeat(5, minmax(0, 1fr))` |  |
| `--grid-cols-7` | `repeat(7, minmax(0, 1fr))` |  |
| `--cursor-width` | `20px` |  |
| `--cursor-big-width` | `60px` |  |
| `--cursor-text-width` | `3px` |  |
| `--cursor-text-height` | `24px` |  |
| `--action-button-width` | `48px` |  |
| `--side-nav-width` | `210px` |  |
| `--active-side-nav-width` | `0px` |  |
| `--header-height` | `64px` |  |
| `--footer-height` | `100px` |  |
| `--scroll-indicator-width` | `36px` |  |
| `--size-6xs` | `4px` |  |
| `--size-5xs` | `8px` |  |
| `--size-4xs` | `12px` |  |
| `--size-3xs` | `16px` |  |
| `--size-2xs` | `20px` |  |
| `--size-xs` | `24px` |  |
| `--size-sm` | `32px` |  |
| `--size-md` | `38px` |  |
| `--size-lg` | `46px` |  |
| `--size-xl` | `56px` |  |
| `--size-2xl` | `64px` |  |
| `--size-3xl` | `72px` |  |
| `--size-4xl` | `80px` |  |
| `--size-5xl` | `96px` |  |
| `--size-6xl` | `112px` |  |
| `--m-sm` | — | `@media (max-width: 480px): 2.1vw` |
| `--m-md` | — | `@media (max-width: 480px): 4.2vw` |
| `--m-lg` | — | `@media (max-width: 480px): 5vw` |

## `src/styles/tokens/_radius.css`

토큰 7개

| 토큰 | 값 |
|---|---|
| `--radius-2xs` | `2px` |
| `--radius-xs` | `4px` |
| `--radius-sm` | `6px` |
| `--radius-md` | `8px` |
| `--radius-2xl` | `24px` |
| `--radius-circle` | `50%` |
| `--radius-capsule` | `9999px` |

## `src/styles/tokens/_shadow.css`

토큰 20개

| 토큰 | 값 | 다크 |
|---|---|---|
| `--shadow-xs` | `0 1px 3px oklch(0.00% 0.0000 0.00 / 0.1), 0 1px 2px oklch(0.00% 0.0000 0.00 / 0.06)` | `0 1px 3px oklch(0.00% 0.0000 0.00 / 0.4), 0 1px 2px oklch(0.00% 0.0000 0.00 / 0.3)` |
| `--shadow-sm` | `0 2px 6px oklch(0.00% 0.0000 0.00 / 0.12), 0 1px 3px oklch(0.00% 0.0000 0.00 / 0.08)` | `0 2px 6px oklch(0.00% 0.0000 0.00 / 0.45), 0 1px 3px oklch(0.00% 0.0000 0.00 / 0.35)` |
| `--shadow-md` | `0 4px 12px oklch(0.00% 0.0000 0.00 / 0.12), 0 2px 4px oklch(0.00% 0.0000 0.00 / 0.08)` | `0 4px 12px oklch(0.00% 0.0000 0.00 / 0.45), 0 2px 4px oklch(0.00% 0.0000 0.00 / 0.35)` |
| `--shadow-lg` | `0 10px 24px oklch(0.00% 0.0000 0.00 / 0.12), 0 4px 8px oklch(0.00% 0.0000 0.00 / 0.08)` | `0 10px 24px oklch(0.00% 0.0000 0.00 / 0.45), 0 4px 8px oklch(0.00% 0.0000 0.00 / 0.35)` |
| `--shadow-xl` | `0 20px 40px oklch(0.00% 0.0000 0.00 / 0.14), 0 8px 16px oklch(0.00% 0.0000 0.00 / 0.08)` | `0 20px 40px oklch(0.00% 0.0000 0.00 / 0.45), 0 8px 16px oklch(0.00% 0.0000 0.00 / 0.35)` |
| `--shadow-2xl` | `0 28px 56px oklch(0.00% 0.0000 0.00 / 0.28)` |  |
| `--shadow-inner` | `inset 0 2px 4px oklch(0.00% 0.0000 0.00 / 0.06)` | `inset 0 2px 6px oklch(0.00% 0.0000 0.00 / 0.3)` |
| `--shadow-glow` | `0 0 20px oklch(100.00% 0.0000 0.00 / 0.3)` | `0 0 30px oklch(100.00% 0.0000 0.00 / 0.15)` |
| `--shadow-text-xs` | `0 1px 2px oklch(0.00% 0.0000 0.00 / 0.15)` |  |
| `--shadow-text-sm` | `0 1px 2px oklch(0.00% 0.0000 0.00 / 0.5)` |  |
| `--shadow-text-md` | `0 1px 4px oklch(0.00% 0.0000 0.00 / 0.5)` |  |
| `--shadow-text-strong` | `0 1px 3px oklch(0.00% 0.0000 0.00 / 0.4)` |  |
| `--blur-xs` | `blur(2px)` |  |
| `--blur-sm` | `blur(4px)` |  |
| `--blur-md` | `blur(8px)` |  |
| `--blur-lg` | `blur(12px)` |  |
| `--blur-xl` | `blur(16px)` |  |
| `--blur-2xl` | `blur(24px)` |  |
| `--blur-3xl` | `blur(40px)` |  |
| `--blur-4xl` | `blur(60px)` |  |

## `src/styles/tokens/_motion.css`

토큰 15개

| 토큰 | 값 |
|---|---|
| `--duration-instant` | `0.1s` |
| `--duration-fast` | `0.15s` |
| `--duration-base` | `0.3s` |
| `--duration-moderate` | `0.35s` |
| `--duration-slow` | `0.5s` |
| `--duration-slower` | `0.8s` |
| `--duration-slowest` | `1.5s` |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--ease-material` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-in-out` | `cubic-bezier(0.25, 0.1, 0.25, 1)` |
| `--delay-none` | `0s` |
| `--delay-short` | `0.1s` |
| `--delay-base` | `0.2s` |
| `--delay-long` | `0.35s` |

## `src/styles/tokens/_z-index.css`

토큰 13개

| 토큰 | 값 |
|---|---|
| `--z-below` | `-1` |
| `--z-content` | `10` |
| `--z-nav` | `100` |
| `--z-float` | `200` |
| `--z-dropdown` | `500` |
| `--z-popover` | `600` |
| `--z-tooltip` | `700` |
| `--z-modal` | `8000` |
| `--z-overlay` | `9000` |
| `--z-fullscreen` | `9500` |
| `--z-loading` | `9800` |
| `--z-top` | `10000` |
| `--z-cursor` | `10100` |

## `src/styles/globals/_semantic.css`

토큰 163개

| 토큰 | 값 | 다크 | 조건부 |
|---|---|---|---|
| `--text-white` | `var(--color-white-alpha-100)` |  |  |
| `--text-white-muted` | `var(--color-white-alpha-50)` |  |  |
| `--text-black` | `var(--color-gray-alpha-100)` |  |  |
| `--text-primary` | `var(--color-neutral-900)` |  |  |
| `--text-secondary` | `var(--color-neutral-800)` |  |  |
| `--text-tertiary` | `var(--color-neutral-700)` |  |  |
| `--text-muted` | `var(--color-neutral-600)` | `var(--color-neutral-500)` |  |
| `--text-inverse` | `var(--color-neutral-0)` |  |  |
| `--text-success` | `var(--color-success)` |  |  |
| `--text-warning` | `var(--color-warning)` |  |  |
| `--text-info` | `var(--color-info)` |  |  |
| `--text-error` | `var(--color-error)` |  |  |
| `--text-success-strong` | `var(--color-success-strong)` |  |  |
| `--text-warning-strong` | `var(--color-warning-strong)` |  |  |
| `--text-info-strong` | `var(--color-info-strong)` |  |  |
| `--text-error-strong` | `var(--color-error-strong)` |  |  |
| `--text-accent` | `var(--color-accent)` |  |  |
| `--text-accent-alt` | `var(--color-accent)` |  |  |
| `--text-on-accent` | `var(--text-white)` | `var(--text-black)` |  |
| `--bg-white` | `var(--color-white-alpha-100)` |  |  |
| `--bg-black` | `var(--color-gray-alpha-100)` |  |  |
| `--bg-primary` | `var(--color-neutral-50)` | `var(--color-neutral-50)` |  |
| `--bg-primary-alt` | `var(--color-neutral-alpha-95)` |  |  |
| `--bg-secondary` | `var(--color-neutral-100)` |  |  |
| `--bg-secondary-alt` | `var(--color-neutral-alpha-20)` |  |  |
| `--bg-tertiary` | `var(--color-neutral-alpha-5)` | `var(--color-inverse-alpha-5)` |  |
| `--bg-tertiary-alt` | `var(--color-neutral-alpha-10)` |  |  |
| `--bg-inverse` | `var(--color-neutral-950)` |  |  |
| `--bg-inverse-light` | `var(--color-neutral-700)` |  |  |
| `--bg-inverse-alt` | `var(--color-inverse-alpha-30)` |  |  |
| `--bg-scheme-light` | `var(--color-scheme-light-bg)` |  |  |
| `--bg-scheme-dark` | `var(--color-scheme-dark-bg)` |  |  |
| `--bg-glass-panel` | `color-mix(in srgb, var(--bg-primary) 24%, transparent)` |  |  |
| `--blur-glass` | `var(--blur-lg) saturate(1.4)` |  |  |
| `--bg-accent-subtle` | `var(--color-accent-alpha-5)` |  |  |
| `--bg-accent-light` | `var(--color-accent-alpha-10)` |  |  |
| `--bg-accent` | `var(--color-accent-alpha-20)` |  |  |
| `--bg-accent-solid` | `var(--color-accent)` |  |  |
| `--bg-accent-solid-light` | `var(--color-accent-light)` |  |  |
| `--bg-accent-solid-dark` | `var(--color-accent-dark)` |  |  |
| `--bg-success` | `var(--color-success-alpha)` |  |  |
| `--bg-success-soft` | `var(--color-success-soft)` |  |  |
| `--bg-success-solid` | `var(--color-success)` |  |  |
| `--bg-warning` | `var(--color-warning-alpha)` |  |  |
| `--bg-warning-soft` | `var(--color-warning-soft)` |  |  |
| `--bg-warning-solid` | `var(--color-warning)` |  |  |
| `--bg-info` | `var(--color-info-alpha)` |  |  |
| `--bg-info-soft` | `var(--color-info-soft)` |  |  |
| `--bg-info-solid` | `var(--color-info)` |  |  |
| `--bg-error` | `var(--color-error-alpha)` |  |  |
| `--bg-error-soft` | `var(--color-error-soft)` |  |  |
| `--bg-error-solid` | `var(--color-error)` |  |  |
| `--bg-accent-strong` | `var(--color-accent-alpha-30)` |  |  |
| `--bg-surface` | `var(--color-gray-alpha-5)` | `var(--color-white-alpha-5)` |  |
| `--bg-glass-subtle` | `var(--color-white-alpha-5)` |  |  |
| `--bg-glass` | `var(--color-white-alpha-10)` |  |  |
| `--bg-glass-strong` | `var(--color-white-alpha-30)` |  |  |
| `--bg-overlay` | `var(--color-gray-alpha-50)` |  |  |
| `--bg-gradient-horizontal-light-to-dark` | `linear-gradient( 90deg, var(--color-neutral-400) 0%, var(--color-neutral-700) 100% )` |  |  |
| `--bg-gradient-horizontal-dark-to-light` | `linear-gradient( 90deg, var(--color-neutral-700) 0%, var(--color-neutral-400) 100% )` |  |  |
| `--bg-gradient-vertical-light-to-dark` | `linear-gradient( 180deg, var(--color-neutral-400) 0%, var(--color-neutral-700) 100% )` |  |  |
| `--bg-gradient-vertical-dark-to-light` | `linear-gradient( 180deg, var(--color-neutral-700) 0%, var(--color-neutral-400) 100% )` |  |  |
| `--bg-gradient-diagonal-light-to-dark` | `linear-gradient( 135deg, var(--color-neutral-300) 0%, var(--color-neutral-800) 100% )` |  |  |
| `--bg-gradient-diagonal-dark-to-light` | `linear-gradient( 135deg, var(--color-neutral-800) 0%, var(--color-neutral-300) 100% )` |  |  |
| `--bg-gradient-accent-fade` | `linear-gradient( to right, transparent, var(--border-color-accent-strong), transparent )` |  |  |
| `--bg-gradient-accent-horizontal` | `linear-gradient( 90deg, var(--color-accent-alpha-20) 0%, var(--color-accent-alpha-80) 100% )` |  |  |
| `--bg-gradient-accent-vertical` | `linear-gradient( 180deg, var(--color-accent-alpha-20) 0%, var(--color-accent-alpha-80) 100% )` |  |  |
| `--bg-gradient-accent-diagonal` | `linear-gradient( 135deg, var(--color-accent-alpha-20) 0%, var(--color-accent-alpha-80) 100% )` |  |  |
| `--border-color-strong` | `var(--color-neutral-alpha-100)` |  |  |
| `--border-color-default` | `var(--color-neutral-alpha-50)` |  |  |
| `--border-color-light` | `var(--color-neutral-alpha-30)` |  |  |
| `--border-color-white` | `var(--color-white-alpha-100)` |  |  |
| `--border-color-black` | `var(--color-gray-alpha-100)` |  |  |
| `--border-color-accent-light` | `var(--color-accent-alpha-20)` |  |  |
| `--border-color-accent` | `var(--color-accent-alpha-30)` |  |  |
| `--border-color-accent-strong` | `var(--color-accent)` |  |  |
| `--border-color-ghost-light` | `var(--color-white-alpha-10)` |  |  |
| `--border-color-ghost` | `var(--color-white-alpha-20)` |  |  |
| `--border-color-white-muted` | `var(--color-white-alpha-50)` |  |  |
| `--border-color-success` | `var(--color-success)` |  |  |
| `--border-color-neutral-light` | `var(--color-neutral-alpha-20)` |  |  |
| `--border-width-thin` | `1px` |  |  |
| `--border-width-default` | `1.5px` |  |  |
| `--border-width-thick` | `2px` |  |  |
| `--border-width-thicker` | `3px` |  |  |
| `--border-width-thickest` | `4px` |  |  |
| `--border-light` | `1px solid var(--border-color-light)` |  |  |
| `--border-light-2` | `2px solid var(--border-color-light)` |  |  |
| `--border-default` | `1px solid var(--border-color-default)` |  |  |
| `--border-strong` | `1px solid var(--border-color-strong)` |  |  |
| `--border-strong-2` | `2px solid var(--border-color-strong)` |  |  |
| `--border-white` | `1px solid var(--border-color-white)` |  |  |
| `--border-inverse` | `1px solid var(--border-color-white)` | `1px solid var(--border-color-black)` |  |
| `--border-neutral-light` | `1px solid var(--border-color-neutral-light)` |  |  |
| `--border-accent-light` | `1px solid var(--border-color-accent-light)` |  |  |
| `--border-accent` | `1px solid var(--border-color-accent)` |  |  |
| `--border-accent-2` | `2px solid var(--border-color-accent)` |  |  |
| `--border-accent-strong` | `1px solid var(--border-color-accent-strong)` |  |  |
| `--border-accent-strong-2` | `2px solid var(--border-color-accent-strong)` |  |  |
| `--border-ghost-light` | `1px solid var(--border-color-ghost-light)` |  |  |
| `--border-ghost` | `1px solid var(--border-color-ghost)` |  |  |
| `--border-white-muted` | `1px solid var(--border-color-white-muted)` |  |  |
| `--border-success` | `1px solid var(--border-color-success)` |  |  |
| `--page-px` | `8vw` |  | `@media (max-width: 768px): 5vw`<br>`@media (max-width: 480px): 4vw` |
| `--page-max-width` | `100%` |  |  |
| `--panel-py` | `clamp(1rem, min(4.5vh, 2.5vw), 4.5rem)` |  | `@media (max-width: 480px): var(--m-lg)` |
| `--font-size-hero` | `clamp(2rem, min(9vw, 18vh), 10rem)` |  |  |
| `--font-size-lead` | `clamp(2rem, min(4vw, 12vh), 6rem)` |  |  |
| `--font-size-subhead` | `clamp(1rem, min(2vw, 3vh), 3.5rem)` |  |  |
| `--font-size-prose` | `clamp(0.75rem, min(1.5vw, 2.5vh), 1.5rem)` |  |  |
| `--font-size-prose-label` | `clamp(0.75rem, min(1vw, 1.75vh), 1.25rem)` |  |  |
| `--font-size-prose-small` | `clamp(0.75rem, min(0.85vw, 1.55vh), 1.15rem)` |  |  |
| `--font-size-prose-caption` | `clamp(0.75rem, min(0.65vw, 1.45vh), 1rem)` |  |  |
| `--font-size-body` | `var(--font-size-sm)` |  |  |
| `--font-size-label` | `var(--font-size-xs)` |  |  |
| `--font-size-hint` | `var(--font-size-2xs)` |  |  |
| `--font-size-micro` | `var(--font-size-3xs)` |  |  |
| `--font-size-title-sm` | `var(--font-size-md)` |  |  |
| `--font-size-title-md` | `var(--font-size-lg)` |  |  |
| `--font-size-title-lg` | `var(--font-size-xl)` |  |  |
| `--font-size-body-lg` | `var(--font-size-md)` |  |  |
| `--font-size-body-xl` | `var(--font-size-lg)` |  |  |
| `--font-size-dot` | `5px` |  |  |
| `--heading-lh` | `var(--line-height-tight)` |  |  |
| `--prose-block-gap` | `var(--spacing-md)` |  |  |
| `--space-section` | `clamp(1rem, min(3.5vh, 2vw), 3.5rem)` |  |  |
| `--space-block` | `clamp(0.75rem, min(3vh, 1.5vw), 2.5rem)` |  |  |
| `--space-divide` | `calc(var(--space-block) * 2)` |  |  |
| `--space-line` | `calc(var(--space-block) / 2)` |  |  |
| `--button-p-xs` | `var(--spacing-3xs) var(--spacing-sm)` |  |  |
| `--button-p-sm` | `var(--spacing-2xs) var(--spacing-md)` |  |  |
| `--button-p-md` | `var(--spacing-xs) var(--spacing-lg)` |  |  |
| `--button-p-lg` | `var(--spacing-sm) var(--spacing-xl)` |  |  |
| `--badge-p-sm` | `var(--spacing-4xs) var(--spacing-2xs)` |  |  |
| `--badge-p-md` | `var(--spacing-3xs) var(--spacing-xs)` |  |  |
| `--badge-p-lg` | `var(--spacing-2xs) var(--spacing-sm)` |  |  |
| `--row-p-sm` | `var(--spacing-2xs) var(--spacing-sm)` |  |  |
| `--row-p-md` | `var(--spacing-xs) var(--spacing-sm)` |  |  |
| `--row-p-lg` | `var(--spacing-sm) var(--spacing-md)` |  |  |
| `--modal-p-sm` | `var(--spacing-xs) var(--spacing-sm)` |  |  |
| `--modal-p-md` | `var(--spacing-md) var(--spacing-lg)` |  |  |
| `--modal-p-lg` | `var(--spacing-xl) var(--spacing-xl)` |  |  |
| `--card-p-sm` | `var(--spacing-2xs) var(--spacing-sm)` |  |  |
| `--card-p-md` | `var(--spacing-md) var(--spacing-md)` |  |  |
| `--card-p-lg` | `var(--spacing-xl) var(--spacing-2xl)` |  |  |
| `--input-p` | `var(--spacing-2xs) var(--spacing-md)` |  |  |
| `--field-p-sm` | `var(--spacing-2xs) var(--spacing-xs)` |  |  |
| `--field-p-md` | `var(--spacing-2xs) var(--spacing-sm)` |  |  |
| `--field-p-lg` | `var(--spacing-xs) var(--spacing-sm)` |  |  |
| `--cell-p-sm` | `var(--spacing-2xs) var(--spacing-xs)` |  |  |
| `--cell-p-md` | `var(--spacing-xs) var(--spacing-sm)` |  |  |
| `--textarea-p` | `var(--spacing-sm) var(--spacing-md)` |  |  |
| `--control-h-2xs` | `20px` |  |  |
| `--control-h-xs` | `24px` |  |  |
| `--control-h-sm` | `28px` |  |  |
| `--control-h-md` | `32px` |  |  |
| `--control-h-lg` | `36px` |  |  |
| `--control-h-xl` | `38px` |  |  |
| `--control-h-2xl` | `46px` |  |  |
| `--skeleton-h-line` | `var(--font-size-body)` |  |  |
| `--skeleton-h-line-sm` | `var(--font-size-label)` |  |  |
| `--skeleton-h-line-lg` | `var(--font-size-lg)` |  |  |
| `--skeleton-h-pill` | `var(--control-h-xs)` |  |  |
