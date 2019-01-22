# electron-browser-archive

WIP PoC browser with WARC capturing

I am using Node >=10 and npm >= 6.5 (and forcing it only to prevent clasing versions).

To quickstart this run:

```
npm install
npm start
```

## Notes

[modules/warc.js](modules/warc.js) was a first working attempt to use [Electron Debugger][electron.debugger] API to capture and write the warc file. However I later [found out](https://github.com/N0taN3rd/node-warc/issues/27#issuecomment-455712716) that [node-warc][node-warc] already had that, so it's not currently being used.

[electron.debugger]: 
https://electronjs.org/docs/api/debugger
[node-warc]: 
https://github.com/N0taN3rd/node-warc
