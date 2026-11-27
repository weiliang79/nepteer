// Manual browser integration check: isolated Chrome CDP on :9226 and Vite on :1420.
// Not native WebView2/HID verification; no project dependency is needed.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
const list = await (
  await fetch(
    `${process.env.BROWSER_CDP ?? "http://127.0.0.1:9226"}/json/version`,
  )
).json();
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let n = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
    }
  });
  return {
    ws,
    call: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++n;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      }),
  };
}
const browser = await connect(list.webSocketDebuggerUrl);
// Native IPC is a synthetic fixture. Browser storage/channel delivery is unmodified.
const source =
  "\nwindow.isTauri=true;\nlet count=0, sequence=0;const callbacks=new Map(),listeners=new Map(),actions=new Map();\nconst status={visible:true,epoch:1,shortcutAvailable:true,shortcutHint:'Ctrl + Alt + Q',notice:null};\nwindow.__TAURI_INTERNALS__={transformCallback:cb=>{callbacks.set(++count,cb);return count;},unregisterCallback:n=>callbacks.delete(n),invoke:async(cmd,args)=>{\n if(cmd==='plugin:event|listen'){listeners.set(++count,args);return count;}\n if(cmd==='plugin:event|unlisten'){listeners.delete(args.eventId);return;}\n if(cmd==='quick_access_status')return {...status};\n if(cmd==='qam_navigation_claim')return {event:{request:args.request,action:actions.get(args.request.sequence)},validForMs:500};\n if(cmd==='qam_navigation_complete')return;\n if(cmd==='get_telemetry')return {source:'mock',capturedAtUnixMs:0,device:{manufacturer:'Simulated',model:'Browser fixture',platform:'Mock',hostPlatform:'macos'},capabilities:{battery:true,cpuTemperature:false,gpuTemperature:false,fanRpm:false,hardwareControls:false},batteryPercent:78,chargeState:'discharging',batteryStatus:'available',issues:[],cpuTemperatureCelsius:null,gpuTemperatureCelsius:null,fanRpm:null};\n throw new Error('Unsupported browser fixture command');\n}};\nwindow.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener:(_event,n)=>listeners.delete(n)};\nconst emit=(name,payload)=>{for(const listener of listeners.values()){if(listener.event===name)callbacks.get(listener.handler)?.({payload});}};\nwindow.__focusFixture={send:action=>{const request={generation:1,epoch:status.epoch,sequence:++sequence};actions.set(sequence,action);emit('qam-navigation',{request,action});},reopen:()=>{status.visible=false;status.epoch++;emit('quick-access-changed',{...status});status.visible=true;status.epoch++;emit('quick-access-changed',{...status});}};\n";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(qam) {
  const { targetId } = await browser.call("Target.createTarget", {
    url: "about:blank",
  });
  const pages = await (
    await fetch(
      `${process.env.BROWSER_CDP ?? "http://127.0.0.1:9226"}/json/list`,
    )
  ).json();
  const c = await connect(
    pages.find((p) => p.id === targetId).webSocketDebuggerUrl,
  );
  c.id = targetId;
  c.eval = async (expression) => {
    const result = await c.call("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await c.call("Page.enable");
  await c.call("Page.addScriptToEvaluateOnNewDocument", { source });
  await c.call("Emulation.setDeviceMetricsOverride", {
    width: qam ? 400 : 1100,
    height: 760,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await c.call("Page.navigate", {
    url: "http://127.0.0.1:1420/" + (qam ? "?qam" : ""),
  });
  await wait(500);
  return c;
}
const qam = await open(true),
  main = await open(false);
await qam.eval(`document.querySelector('[data-qam-control=settings]').click()`);
await qam.eval(`document.querySelector('[data-qam-control=light]').click()`);
await wait(100);
assert.equal(
  await main.eval(`document.documentElement.dataset.theme`),
  "light",
);
await main.eval(
  `Array.from(document.querySelectorAll('.nav-item')).find(x=>x.textContent.includes('Settings')).click()`,
);
await wait(50);
await main.eval(
  `(()=>{const el=document.querySelectorAll('.settings select')[1];el.value='fahrenheit';el.dispatchEvent(new Event('change',{bubbles:true}));})()`,
);
await wait(100);
assert.equal(
  await qam.eval(
    `document.querySelector('[data-qam-control=fahrenheit]').getAttribute('aria-pressed')`,
  ),
  "true",
);
await Promise.all([
  qam.eval(
    `(async()=>{const {preferenceStore:s}=await import('/src/lib/preferences.ts');for(let i=0;i<20;i++)s.update('theme',i%2?'light':'dark');})()`,
  ),
  main.eval(
    `(async()=>{const {preferenceStore:s}=await import('/src/lib/preferences.ts');for(let i=0;i<20;i++)s.update('unit',i%2?'fahrenheit':'celsius');})()`,
  ),
]);
await wait(200);
for (const c of [main, qam])
  assert.deepEqual(
    await c.eval(
      `(async()=>{const {preferenceStore:s}=await import('/src/lib/preferences.ts');return s.getSnapshot().preferences;})()`,
    ),
    { theme: "light", unit: "fahrenheit" },
  );
await qam.call("Page.bringToFront");
await qam.eval(`document.querySelector('[data-qam-control=light]').focus()`);
const layout = await qam.eval(
  `(()=>{const n=document.querySelector('.qam-navigation'),b=[...document.querySelectorAll('button[data-qam-control]')];return {viewport:[innerWidth,innerHeight],bodyWidth:document.body.scrollWidth,bodyHeight:document.body.scrollHeight,navigationHeight:n.clientHeight,navigationScrollHeight:n.scrollHeight,targets:b.map(x=>({name:x.dataset.qamControl,width:x.offsetWidth,height:x.offsetHeight})),focus:document.activeElement.dataset.qamControl,outline:getComputedStyle(document.activeElement).outline};})()`,
);
assert.equal(layout.bodyWidth, 400);
assert.ok(layout.targets.every((t) => t.height >= 48));
console.log(
  "REAL browser synchronization, rapid changes and layout",
  JSON.stringify(layout),
);
await fs.writeFile(
  join(tmpdir(), "nepteer-step6a-settings-light.png"),
  Buffer.from((await qam.call("Page.captureScreenshot")).data, "base64"),
);
await qam.eval(
  `document.querySelector('[data-qam-control=dark]').click();document.querySelector('[data-qam-control=dark]').focus()`,
);
await wait(120);
await fs.writeFile(
  join(tmpdir(), "nepteer-step6a-settings-dark.png"),
  Buffer.from((await qam.call("Page.captureScreenshot")).data, "base64"),
);
for (const c of [main, qam]) {
  c.ws.close();
  await browser.call("Target.closeTarget", { targetId: c.id });
}
const reopened = await open(true);
assert.equal(
  await reopened.eval(`document.documentElement.dataset.theme`),
  "dark",
);
assert.equal(
  await reopened.eval(
    `JSON.parse(localStorage.getItem('nepteer.preferences')).unit`,
  ),
  "fahrenheit",
);
console.log(
  "Fresh renderer reload: dark/Fahrenheit persisted. IPC was mocked; storage and BroadcastChannel were real Chromium. Windows WebView2 remains pending.",
);
reopened.ws.close();
await browser.call("Target.closeTarget", { targetId: reopened.id });
browser.ws.close();
