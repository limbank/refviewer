# RefViewer
RefViewer is an image viewer designed to aid artists and developers alike in their creative process. RefViewer allows you to quickly grab an image from anywhere you want, from a screenshot to dragging an image from your browser to selecting one from your local machine and then display that image while you work. 

### Technology
RefViewer is built with `Svelte` and `Electron`, and uses `Sharp` as it's main image processing engine.

### Get RefViewer
Download the most recent [stable build](https://github.com/starbrat/refviewer/releases/latest) or get a cutting-edge pre-release build from the [releases page](https://github.com/starbrat/refviewer/releases) (**Warning!** May contain bugs!).

I build RefViewer for Windows with each release, but if you are using a *nix machine, feel free to grab the source code and build it yourself. All you need to have installed is `Node`, `Electron` and `electron-builder`.

### Contributing
If you notice a bug, or want to suggest a new feature, feel free to create a Github issue, or contact me directly. You can follow the development process over on RefViewer's [Trello page](https://trello.com/b/NlCLf8lW/refviewer).


## Boring stuff

### Explanation on versioning

This software follows a custom versioning model similar to SemVer.

The first number indicates a major, from-scratch rewrite. We moved to version 4 when we rewrote RefViewer from the ground up to use Svelte.

The second number indicates a significant iteration to the current architecture. The number increases typically when a large change in workflow, appearance or architecture occurs within the current iteration.

The last number indicates a new feature, fix, or update. Small features such as new tools, bug fixes concerning existing tools, new themes, etc. all fall within this category.

Pre-releases are typically made available when a new feature has been implemented but not thoroughly tested or when a new suggestion is implemented and requires feedback.

Stable releases are made available when most of the current feature set functions as intended and doesn't cause any issues or interruptions in your typical workflow.
