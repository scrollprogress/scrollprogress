# Debug theming

The ScrollProgress palette and overlay embed a default theme. Alternative themes
are ordinary CSS files: importing one makes its rules available, while the
`theme` constructor option selects those rules through the
`data-scroll-progress-debug-theme` attribute.

The option does not resolve a file name, load a stylesheet, or start a network
request. Import the CSS before constructing the debug view.

A `theme` name with no matching CSS still adds the data attribute, but the view
effectively continues to show its embedded default values. Importing an external
theme does not prevent the palette or overlay from inserting its own embedded
`<style>` element.

The examples assume a bundler that supports CSS imports. Without one, copy the
theme file into the application's stylesheet pipeline instead.

The JavaScript examples also compile unchanged as TypeScript.

## Theme a debug session

Session options are forwarded separately to the palette and overlay factories, so
the common case can configure both views during session construction:

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { createScrollProgressDebugger } from '@scrollprogress/scrollprogress/debug/session';
import '@scrollprogress/scrollprogress/debug/themes/paper.css';

const target = document.querySelector('[data-scroll-target]');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing scroll target');
}

const tracker = trackScrollProgress(target);
const debug = createScrollProgressDebugger(tracker, {
    label: 'Story',
    palette: { theme: 'paper' },
    overlay: { theme: 'paper' }
});

function cleanup() {
    debug.destroy();
    tracker.destroy();
}
```

The session has no shared `theme` option. Pass view options through `palette` and
`overlay`; they can use the same theme, different themes or their embedded
defaults. Use the session form when both tools can share one lifecycle through
`debug.destroy()`.

The examples below use the individual factories to expose separate controllers.
Choose that form when palette and overlay must be destroyed or recreated
independently, as shown in [Runtime behavior](#runtime-behavior).

## Optional themes

ScrollProgress includes two optional themes. Neither is part of the palette or
overlay JavaScript bundle unless it is imported explicitly.

### Neon Grid

[View or copy the Neon Grid source](../src/lib/debug/themes/neon-grid.css).

```js
import { createDebugPalette } from '@scrollprogress/scrollprogress/debug/palette';
import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';
import '@scrollprogress/scrollprogress/debug/themes/neon-grid.css';

const palette = createDebugPalette({ theme: 'neon-grid' });
const overlay = createDebugOverlay({ theme: 'neon-grid' });

function cleanup() {
    overlay.destroy();
    palette.destroy();
}
```

### Paper

[View or copy the Paper source](../src/lib/debug/themes/paper.css).

```js
import { createDebugPalette } from '@scrollprogress/scrollprogress/debug/palette';
import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';
import '@scrollprogress/scrollprogress/debug/themes/paper.css';

const palette = createDebugPalette({ theme: 'paper' });
const overlay = createDebugOverlay({ theme: 'paper' });

function cleanup() {
    overlay.destroy();
    palette.destroy();
}
```

Each stylesheet contains both palette and overlay rules. Importing a theme is
still valid when the application creates only one of those views; the unused CSS
rules have no effect.

Palette and overlay can also use different themes. Import both stylesheets and
pass the desired name to each constructor:

```js
import { createDebugPalette } from '@scrollprogress/scrollprogress/debug/palette';
import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';
import '@scrollprogress/scrollprogress/debug/themes/neon-grid.css';
import '@scrollprogress/scrollprogress/debug/themes/paper.css';

const palette = createDebugPalette({ theme: 'paper' });
const overlay = createDebugOverlay({ theme: 'neon-grid' });

function cleanup() {
    overlay.destroy();
    palette.destroy();
}
```

In the repository, both files live under `src/lib/debug/themes/` because they
belong to the optional debug views rather than the ScrollProgress core. The
package exports them through the shorter public `debug/themes/*` subpaths shown
above. The same readable CSS files are included in the published package, so
they can be copied into an application and used as a starting point.

## Custom themes

A custom theme defines public ScrollProgress custom properties on the component
root selected by its theme name:

```css
.scroll-progress-debug-palette[data-scroll-progress-debug-theme='custom'] {
    --sp-debug-palette-bg: #06111d;
    --sp-debug-palette-color: #d8f9ff;
    --sp-debug-palette-accent: #00e5ff;
}

.scroll-progress-debug-overlay[data-scroll-progress-debug-theme='custom'] {
    --sp-debug-overlay-target-color: #ffe66d;
    --sp-debug-overlay-root-color: #00e5ff;
}
```

```js
import { createDebugPalette } from '@scrollprogress/scrollprogress/debug/palette';
import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';
import './debug-theme.css';

const palette = createDebugPalette({ theme: 'custom' });
const overlay = createDebugOverlay({ theme: 'custom' });

function cleanup() {
    overlay.destroy();
    palette.destroy();
}
```

Copy the complete [palette theme template](examples/debug-palette-theme.css) or
[overlay theme template](examples/debug-overlay-theme.css) when every supported
property is needed. The templates are separate so an application can customize
only one view. A partial theme is valid; omitted properties keep their embedded
defaults.

Properties beginning `--sp-debug-palette-` or `--sp-debug-overlay-` and not
containing `token-` form the public CSS customization contract. Properties
containing `token-` are implementation details and should not be overridden.

## Precedence

Values are resolved in this order, from strongest to weakest:

1. overlay values supplied through the `colors` constructor option;
2. custom properties from the selected CSS theme;
3. the embedded default theme.

`colors` is partial. Supplying one overlay color leaves the remaining colors and
all other overlay styling under the selected theme.

The `className` option remains available for general application hooks. Theme
rules should use the documented root class together with the theme data attribute,
as shown above. Those selectors are more specific than the embedded default
selectors, so ordinary theme declarations do not depend on stylesheet order. This
is not an absolute cascade guarantee in the presence of `!important`, cascade
layers or more-specific application overrides.

## Runtime behavior

Themes are selected only during construction. Controllers do not expose a theme
registry, dynamic stylesheet loader or `setTheme()` method. To choose another
theme, destroy and recreate the individual debug view or its owning session with
another imported theme name.

Keep tracker registration in a session and manage a view independently when only
that view needs to change theme:

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { createScrollProgressDebugger } from '@scrollprogress/scrollprogress/debug/session';
import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';
import '@scrollprogress/scrollprogress/debug/themes/neon-grid.css';
import '@scrollprogress/scrollprogress/debug/themes/paper.css';

const target = document.querySelector('[data-scroll-target]');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing scroll target');
}

const tracker = trackScrollProgress(target);
const session = createScrollProgressDebugger(tracker);
let overlay = createDebugOverlay({ theme: 'neon-grid' });

overlay.destroy();
overlay = createDebugOverlay({ theme: 'paper' });

function cleanup() {
    overlay.destroy();
    session.destroy();
    tracker.destroy();
}
```

Recreating the overlay leaves the session's tracker registrations in place. The
same ownership pattern works with an independently created palette.
