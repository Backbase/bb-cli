# ${widget.name}
${widget.description}

## Information

| name                  | version           | bundle           |
| ----------------------|:-----------------:| ----------------:|
| ${widget.name}        | ${widget.version} | Launchpad        |

## Widget Checklist

 - [ ] Fault Tolerance: Widget gracefully behaves/fails with loss of connection.
 - [ ] Fault Tolerance: Widget gracefully fails if session is lost.
 - [ ] Fault Tolerance: Widget gracefully and productively handles error responses.
 - [ ] Extensibility: Look and feel is manageable via theming.
 - [ ] Extensibility: Decomposable.
 - [ ] Security: Secure from XSS.
 - [ ] Security: Secure from CSRF.
 - [ ] Accessibility: Support for color blind users.
 - [ ] Accessibility: Support for users with motor-inability (keyboard navigation).
 - [ ] Accessibility: Support for users who are blind (screen reader).
 - [ ] i18n: All UI messages are externalized and localizable.
 - [ ] i18n: All dates and numbers are localized.
 - [ ] i18n: Works RTL.
 - [ ] Mobile: SDK compatible.
 - [ ] Mobile: Widget is responsive to mobile & tablet.
 - [ ] Documentation: Reference files linked from README.
 - [ ] Documentation: Dependencies (bower & UI components used) listed in README.
 - [ ] Documentation: Modules/classes JSDoc.
 - [ ] Documentation: Widget feature list documented.
 - [ ] Testing: Distribution folder.
 - [ ] Testing: Unit testing.
 - [ ] Testing: Functional testing.

N.B. [Guidelines and standards](https://stash.backbase.com/projects/LP/repos/workshops/browse)
## Dependencies

* base ~2.x
* core ~2.x
* ui ~2.x

## Dev Dependencies

* mock *
* angular-mocks ~1.2.28
* config ~2.x

## Preferences
- List of widget preferences

## Events
- List of event the widget publishes/subscribes

## Custom Components
- list of widget custom components (if any)

## Develop Standalone

```bash
git clone <repo-url> && cd <widget-path>
bower install
```

## Test

```bash
bblp start
```

with watch flag
```bash
bblp test -w
```


## Build

```bash
bblp build
```

## Requirements

### User Requirements

### Business Requirements

## References
