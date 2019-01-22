const { RequestHandler, WARCWriterBase } = require('node-warc')
const { CRLF } = require('../node_modules/node-warc/lib/writers/warcFields')
const { noGZ, replaceContentLen } = require('../node_modules/node-warc/lib/writers/constants')
const util = require('util');

/**
 * @desc WARC Generator for use with chrome-remote-interface
 * @see https://github.com/cyrus-and/chrome-remote-interface
 * @extends {WARCWriterBase}
 */
class DebuggerWARCGenerator extends WARCWriterBase {
  /**
   * @param {RemoteChromeRequestCapturer} capturer - The RemoteChrome request capturer that contains requests
   * to be serialized to the WARC
   * @param {Object} network - The chrome-remote-interface Network object
   * @param {WARCGenOpts} genOpts - Options for generating the WARC and optionally generating
   * WARC info, WARC info + Webrecorder Player bookmark list, metadata records
   * @return {Promise<?Error>} - A Promise that resolves when WARC generation is complete
   */
  async generateWARC (capturer, debug, genOpts) {
    const { warcOpts, winfo, metadata } = genOpts
    this.initWARC(warcOpts.warcPath, warcOpts)
    /* istanbul ignore if */
    if (winfo != null) {
      await this.writeWarcInfoRecord(winfo)
    }
    if (genOpts.pages) {
      await this.writeWebrecorderBookmarksInfoRecord(genOpts.pages)
    }
    /* istanbul ignore if */
    if (metadata != null) {
      await this.writeWarcMetadata(metadata.targetURI, metadata.content)
    }
    for (let request of capturer.iterateRequests()) {
      try {
        await this.generateWarcEntry(request, debug)
      } catch (error) {
        /* istanbul ignore next */
        console.error(error)
      }
    }
    return new Promise(resolve => {
      this.once('finished', resolve)
      this.end()
    })
  }

  /**
   * @desc Generate a WARC record
   * @param {CDPRequestInfo} nreq - The captured HTTP info
   * @param {Object} network - The chrome-remote-interface Network object
   * @return {Promise<void>}
   */
  async generateWarcEntry (nreq, debug) {
    const sendCommand = util.promisify(debug.sendCommand);
    if (nreq.url.indexOf('data:') === 0) return
    let postData
    if (nreq.postData) {
      postData = nreq.postData
    } else if (nreq.hasPostData) {
      try {
        let rbody = await sendCommand('Network.getRequestPostData', {requestId: nreq.requestId});
        postData = Buffer.from(post.postData, 'utf8')
      } catch (e) {}
    }
    if (nreq.canSerializeResponse()) {
      let resData
      let responseHeaders = nreq.serializeResponseHeaders()
      // console.log(responseHeaders);
      if (nreq.getBody) {
        let wasError = false
        try {
          let rbody = await sendCommand('Network.getResponseBody', {requestId: nreq.requestId});
          if (rbody.base64Encoded) {
            resData = Buffer.from(rbody.body, 'base64')
          } else {
            resData = Buffer.from(rbody.body, 'utf8')
          }
        } catch (err) {
          wasError = true
        }
        if (!wasError) {
          responseHeaders = responseHeaders.replace(noGZ, '')
          responseHeaders = responseHeaders.replace(
            replaceContentLen,
            `Content-Length: ${Buffer.byteLength(resData, 'utf8')}${CRLF}`
          )
        } else {
          // indicate that this record has 0 content
          responseHeaders = responseHeaders.replace(
            replaceContentLen,
            `Content-Length: 0${CRLF}`
          )
        }
      }
      return this.writeRequestResponseRecords(
        nreq.url,
        {
          headers: nreq.serializeRequestHeaders(),
          data: postData
        },
        {
          headers: responseHeaders,
          data: resData
        }
      )
    }
    return this.writeRequestRecord(
      nreq.url,
      nreq.serializeRequestHeaders(),
      postData
    )
  }
}

/**
 * @extends {RequestHandler}
 * @desc The remote chrome request chapturer to use along side {@link RemoteChromeWARCGenerator}
 * The only setup required is to pass the chrome-remote-interface Network object
 * Controlled via {@link startCapturing} and {@link stopCapturing}
 * @see https://github.com/cyrus-and/chrome-remote-interface
 * @see https://chromedevtools.github.io/devtools-protocol/tot/Network
 */
class DebuggerRequestCapturer extends RequestHandler {
  /**
   * @param {?Object} [debugger] - The chrome-remote-interface Network object
   */
  constructor (debug) {
    super()
    this.attach(debug)
  }

  /**
   * @param {Object} network - The chrome-remote-interface Network object to be attached to
   */
  attach (debug) {
    /* istanbul ignore else */
    if (debug) {
      debug.on('message', (event, method, params) => {
        if (method === 'Network.requestWillBeSent') {
          this.requestWillBeSent(params);
        }
        if (method === 'Network.responseReceived') {
          this.responseReceived(params)
        }
      })
    }
  }

  /**
   * @param {Object} cdpClient - The chrome-remote-interface client object to detach from
   */
  detach (cdpClient) {
    /* istanbul ignore else */
    if (cdpClient) {
      // cdpClient.removeListener('Network.requestWillBeSent', this.requestWillBeSent)
      // cdpClient.removeListener('Network.responseReceived', this.responseReceived)
    }
  }
}

/**
 * @type {RemoteChromeRequestCapturer}
 */
module.exports = { DebuggerRequestCapturer, DebuggerWARCGenerator }
