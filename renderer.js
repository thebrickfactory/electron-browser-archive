const { ElectronCapturer, ElectronWARCWriter } = require('node-warc')

  onload = () => {
    const { Menu, MenuItem } = require('electron').remote
    var nodeConsole = require('console');
    var myConsole = new nodeConsole.Console(process.stdout, process.stderr);

    const webview = document.querySelector('webview')
    const url = document.querySelector('#url')

    let rightClickPosition = null

    const debug = webview.getWebContents().debugger
    debug.attach('1.1')
    debug.sendCommand('Network.enable')
    const cap = new ElectronCapturer()
    cap.attach(debug)

    const menu = new Menu()
    const menuItem1 = new MenuItem({
      label: 'Download it yo!',
      click: (menuItem, browserWindow, event) => {
        console.log('click');
        console.log(webview.getWebContents());
        console.log(event);
        console.log(rightClickPosition);
        webview.getWebContents().inspectElement(rightClickPosition.x, rightClickPosition.y)
        const { exec } = require('child_process');
        exec('youtube-dl | wc -l', (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.log(`stderr: ${stderr}`);
        });
      }
    })
    const menuItem2 = new MenuItem({
      label: 'Warc it yo!',
      click: (menuItem, browserWindow, event) => {
        const warcGen = new ElectronWARCWriter()
        console.log(cap)
        warcGen.generateWARC(cap, debug, {
          warcOpts: {
            warcPath: 'myWARC.warc'
          },
          winfo: {
            description: 'I created a warc!',
            isPartOf: 'My awesome electron1 collection'
          }
        })
      }
    })
    menu.append(menuItem1)
    menu.append(menuItem2)

    // webview.addEventListener('contextmenu', (e) => {
    //   console.log('oh yeah')
    //   e.preventDefault()
    //   // rightClickPosition = {x: e.x, y: e.y}
    //   menu.popup()
    // }, false)

    // require('electron-context-menu')({
    //     window: webview,
    //     prepend: (params, browserWindow) => [{
    //         label: 'Rainbow',
    //         // Only show it when right-clicking images
    //         visible: params.mediaType === 'image'
    //     }]
    // });

    webview.addEventListener('dom-ready', () => {
      console.log('dom ready')
      webview.getWebContents().on('context-menu', (e, params) => {
        console.log('oh yeah')
        console.log(e)
        console.log(params)
        e.preventDefault()
        rightClickPosition = {x: params.x, y: params.y}
        menu.popup()
      }, false)
        webview.openDevTools()
    })


    window.addEventListener('contextmenu', (e) => {
      console.log('oh yeah')
      e.preventDefault()
      // rightClickPosition = {x: e.x, y: e.y}
      menu.popup()
    }, false)

    webview.addEventListener('will-navigate', (e) => {
      url.value = e.url
    })
    webview.addEventListener('did-start-loading', () => {
      $('#refresh i.fa').removeClass('fa-redo').addClass('fa-spinner fa-pulse');
    })
    webview.addEventListener('did-stop-loading', () => {
      url.value = webview.src
      $('#refresh i.fa').removeClass('fa-spinner fa-pulse').addClass('fa-redo');
    })
}
