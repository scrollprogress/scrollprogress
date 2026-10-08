# ScrollProgress

ScrollProgress is a small, dependency-free browser library for turning an element's
position inside a viewport or scroll container into a progress value between `0`
and `1`.

The current release candidate is
`@scrollprogress/scrollprogress@1.0.0-rc.1`. It is ESM-only and includes TypeScript
declarations.

```sh
npm install @scrollprogress/scrollprogress@rc
```

Use the scoped package name shown above. The unscoped `scrollprogress` package on
npm is a different project.

## First tracker

The example uses syntax shared by JavaScript and TypeScript:

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector('.story');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing .story');
}

const tracker = trackScrollProgress(target, {
    onUpdate({ progress }) {
        console.log(progress);
    }
});
```

`progress` starts at `0`, ends at `1` and is clamped to that range. By default,
progress begins when the target's leading edge reaches 80% of the viewport height
and finishes when its trailing edge reaches 40%.

The tracker owns its event listeners, observers and scheduled updates. Destroy it
when the component or page section that owns it is removed:

```js
tracker.destroy();
```

See the [core guide](docs/scroll-progress-core.md) for state, subscriptions,
cleanup, custom scroll roots, CSS custom properties and `once`.

## Public entries

| Entry                                           | Purpose                                           |
| ----------------------------------------------- | ------------------------------------------------- |
| `@scrollprogress/scrollprogress`                | Continuous tracking and advanced one-shot reads   |
| `@scrollprogress/scrollprogress/debug/session`  | Compose trackers and debug tools in one lifecycle |
| `@scrollprogress/scrollprogress/debug`          | Connect a tracker to the optional debug registry  |
| `@scrollprogress/scrollprogress/debug/registry` | Access and extend the shared debug registry       |
| `@scrollprogress/scrollprogress/debug/console`  | Quickly inspect the selected item in the console  |
| `@scrollprogress/scrollprogress/debug/palette`  | Show interactive debug information and controls   |
| `@scrollprogress/scrollprogress/debug/overlay`  | Visualize targets, progress markers and bounds    |

Core imports do not include debug code. Optional debug themes are exposed as
separate CSS imports.

## Documentation

- [Core guide](docs/scroll-progress-core.md) — start with a tracker and progress
  through state, lifecycle and advanced options.
- [Recipes](docs/recipes.md) — complete progress bar, reveal, CSS, custom-root and
  Web Animations examples.
- [API reference](docs/api.md) — functions, options, state, tracker methods and
  public types.
- [Debug tools](docs/debug.md) — sessions, bridge, console logger, palette and
  third-party registry integrations.
- [Debug overlay](docs/debug-overlay.md) — layers, colors, labels and custom roots.
- [Debug theming](docs/theming.md) — built-in themes and public custom properties.
- [Compatibility](docs/compatibility.md) — browser requirements, TypeScript support
  and known limitations.

## Project

[Changelog](CHANGELOG.md) ·
[Contributing](https://github.com/scrollprogress/scrollprogress/blob/main/CONTRIBUTING.md) ·
[Security](https://github.com/scrollprogress/scrollprogress/blob/main/SECURITY.md) ·
[Code of Conduct](https://github.com/scrollprogress/scrollprogress/blob/main/CODE_OF_CONDUCT.md)

ScrollProgress is licensed under the [MIT License](LICENSE).
