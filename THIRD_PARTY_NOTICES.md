# Third-party notices

## OpenCode (vendored TUI)

The OpenCode TUI and its supporting Bun workspace are vendored under
`tui/opencode/`. They come from OpenCode v2.4.2, commit
`fc31a485317970bcf6be7b431a9830aaef875731`, available at
<https://github.com/anomalyco/opencode>. OpenCode is licensed under the MIT
License:

> Copyright (c) 2025 opencode
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

The vendored tree includes the upstream `packages/`, `services/`, `patches/`
and `script/` directories plus the root `package.json`, `bunfig.toml`,
`tsconfig.json`, `bun.lock` and `LICENSE`. OpenCode source code and MIT license
notices are preserved. Jarvis branding changes:

- The root workspace package is renamed to `jarvis-opencode-tui`, version
  `2.4.2-jarvis`; workspaces, catalog and `packageManager: bun@1.4.4` are
  unchanged.
- The OpenCode ASCII wordmark in `packages/tui/src/logo.ts` was replaced with a
  Jarvis placeholder wordmark. No OpenCode logos or brand assets are displayed
  in the vendored TUI.

## OpenTUI

`@opentui/core` and `@opentui/react` version 0.9.9 are licensed under the MIT
License. See <https://github.com/anomalyco/opentui>.
