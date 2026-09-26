import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';

class BrowserConnection {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    this.events = [];
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) {
        this.events.push(message);
        return;
      }
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    });
    socket.addEventListener('close', () => {
      for (const request of this.pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error('Isolated browser connection closed'));
      }
      this.pending.clear();
    });
  }

  call(method, params = {}, timeout = 120000) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Browser command timed out: ${method}`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.call('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true, userGesture: true,
    });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  }

  async click(expression) {
    const point = await this.evaluate(`(()=>{
      const element=${expression};
      if(!element)throw new Error('Expected Strudel control is missing');
      const r=element.getBoundingClientRect();
      return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await this.call('Input.dispatchMouseEvent', { type, button: 'left', clickCount: 1, ...point });
    }
  }
}

export async function launchBrowser(executable) {
  const profile = await mkdtemp(join(tmpdir(), 'strudel-audio-'));
  const child = spawn(executable, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--window-size=1440,1000', 'about:blank',
  ], { stdio: 'ignore' });
  let startError;
  child.once('error', error => { startError = error; });
  let port;
  for (let i = 0; i < 100; i++) {
    if (startError) throw startError;
    if (child.exitCode !== null) throw new Error(`Isolated browser exited: ${child.exitCode}`);
    try {
      port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await delay(200);
    }
  }
  if (!port) {
    child.kill();
    throw new Error(`Browser debugging port did not appear; temporary profile: ${profile}`);
  }
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find(item => item.type === 'page');
  if (!target) {
    child.kill();
    throw new Error(`No page in isolated browser; temporary profile: ${profile}`);
  }
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const page = new BrowserConnection(socket);
  await page.call('Page.enable');
  await page.call('Runtime.enable');
  await page.call('Network.enable');
  return {
    page,
    async close() {
      const exited = child.exitCode !== null ? Promise.resolve()
        : new Promise(resolve => child.once('exit', resolve));
      await page.call('Browser.close');
      await exited;
      await rm(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 200 });
    },
  };
}
