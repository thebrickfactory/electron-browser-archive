const { app, BrowserWindow, session, protocol } = require('electron')
const path = require('path')

// Enable live reload for all the files inside your project directory
require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
  hardResetMethod: 'exit',
  ignored: /.warc|node_modules|[\/\\]\./,
});

// require('electron-context-menu')({
//     prepend: (params, browserWindow) => [{
//         label: 'Rainbow',
//         // Only show it when right-clicking images
//         visible: params.mediaType === 'image'
//     }]
// });

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow () {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // console.log(details);
    callback({});
  })

  // protocol.registerHttpProtocol('https', (request, callback) => {
  //   // console.log(request);
  //   // request._hanoii = true;
  //   // callback(request)
  // })


  // Create the browser window.
  win = new BrowserWindow({ width: 1280, height: 900 })


  // and load the index.html of the app.
  win.loadFile('index.html')

  try {
    console.log('try');
    win.webContents.debugger.attach('1.1')
  } catch (err) {
    console.log('Debugger attach failed : ', err)
  }

  win.webContents.debugger.on('detach', (event, reason) => {
    console.log('Debugger detached due to : ', reason)
  })

  win.webContents.debugger.on('message', (event, method, params) => {
    if (method === 'Network.requestWillBeSent') {
      if (params.request.url === 'https://www.github.com') {
        win.webContents.debugger.detach()
      }
    }
  })

  win.webContents.debugger.sendCommand('Network.enable')

  // Open the DevTools.
  win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Listen for web contents being created
app.on('web-contents-created', (e, contents) => {

  // Check for a webview
  if (contents.getType() == 'webview') {

    // Listen for any new window events
    contents.on('new-window', (e, url) => {
      console.log(url);
      e.preventDefault()
      shell.openExternal(url)
    })
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})
