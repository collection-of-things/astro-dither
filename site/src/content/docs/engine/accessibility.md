---
title: Accessibility
description: Decorative surfaces, kept alt text, and a still frame for reduced motion.
order: 8
section: Engine
---

## Decorative by default

Backgrounds are rendered `aria-hidden`. Put real text on top of them, never inside. If a surface carries meaning, label it yourself with an `aria-label` on its parent.

## Images keep their alt

`DitherImage` leaves the `img` and its `alt` in the DOM. Screen readers announce the alt text whether or not the shader starts, and with JavaScript off the original photo shows.

## Reduced motion

With `prefers-reduced-motion: reduce`, ordered surfaces draw one frame at `stillTime` and stop. Paper-backed components (`Dither` and `DitherImage`) use their `frame` setting with playback stopped. The components also respond when the OS setting changes while the page is open.

## Without WebGL

If WebGL2 is unavailable an ordered surface renders nothing; build pages so the background is decorative. `DitherImage` still shows the plain `img`.
