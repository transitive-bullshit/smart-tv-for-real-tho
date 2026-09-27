"""Long-lived JSON-lines device bridge. Stdout is exclusively protocol output."""
import asyncio
import contextlib
import ipaddress
import json
import logging
import os
from pathlib import Path
import secrets
import sys
import time

from aiohttp import web
from aiowebostv import WebOsClient
from aiowebostv.exceptions import WebOsTvResponseTypeError
from pyytlounge.wrapper import YtLoungeApi
from pyytlounge.event_listener import EventListener
from pythonxbox.authentication.manager import AuthenticationManager
from pythonxbox.authentication.models import OAuth2TokenResponse
from pythonxbox.common.signed_session import SignedSession
from pythonxbox.api.client import XboxLiveClient

# Dependencies sometimes log authenticated URLs/tokens. Never propagate their logs.
logging.disable(logging.CRITICAL)
ROOT = Path(__file__).resolve().parent.parent / ".local"
CLIENT_ID = os.environ.get("XBOX_CLIENT_ID", "388ea51c-0b25-4029-aae2-17df49d23905")
REDIRECT = "http://localhost:8080/auth/callback"

def now():
    return int(time.time() * 1000)

def load(name):
    path = ROOT / name
    return json.loads(path.read_text()) if path.exists() else None

def save(name, data):
    ROOT.mkdir(mode=0o700, exist_ok=True)
    tmp = ROOT / (name + ".tmp")
    with os.fdopen(os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as f:
        json.dump(data, f)
    tmp.replace(ROOT / name)

class SetupError(Exception):
    pass

class Listener(EventListener):
    def __init__(self, owner):
        self.owner = owner
    async def now_playing_changed(self, event):
        self.owner.yt_state.update(videoId=event.video_id, playback=event.state.name, observedAt=now())
    async def playback_state_changed(self, event):
        # A playback event has no video ID; request now-playing to correlate it.
        if self.owner.yt:
            await self.owner.yt.get_now_playing()
    async def disconnected(self, event):
        self.owner.yt_state["connected"] = False

class Bridge:
    def __init__(self):
        self.tv = None
        self.yt = None
        self.yt_task = None
        self.xsession = None
        self.auth = None
        self.xbox = None
        self.auth_runner = None
        self.auth_expiry = None
        self.auth_nonce = None
        self.apps = []
        self.inputs = []
        self.products = []
        self.console_id = ""
        self.tv_lock = asyncio.Lock()
        self.yt_lock = asyncio.Lock()
        self.xbox_lock = asyncio.Lock()
        self.yt_state = dict(connected=False, observedAt=0, receiverId=None, videoId=None, playback="unknown")
        self.xbox_state = dict(connected=False, observedAt=0, activeTitle=None)

    async def tv_connect(self, host=None):
        pairing = load("lg.json") or {}
        host = host or pairing.get("host")
        if not host:
            raise SetupError("Enter the TV IPv4 address, then accept its pairing prompt.")
        ipaddress.IPv4Address(host)
        async with self.tv_lock:
            if self.tv and self.tv.host == host and self.tv.is_connected():
                return
            if self.tv:
                await self.tv.disconnect()
            key = pairing.get("key") if pairing.get("host") == host else None
            self.tv = WebOsClient(host, client_key=key, connect_timeout=15)
            if not await self.tv.connect():
                raise SetupError("LG pairing was not accepted.")
            save("lg.json", dict(host=host, key=self.tv.client_key))

    async def yt_init(self):
        if not self.yt:
            self.yt = YtLoungeApi("Smart TV for real tho", event_listener=Listener(self))
            await self.yt.__aenter__()
            state = load("youtube.json")
            if state:
                self.yt.load_auth_state(state)

    async def yt_connect(self):
        async with self.yt_lock:
            await self.yt_init()
            if not self.yt.paired():
                raise SetupError("Open native YouTube > Settings > Link with TV code and pair here.")
            if self.yt.connected() and self.yt_task and not self.yt_task.done():
                return
            if self.yt_task:
                self.yt_task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await self.yt_task
            if not await self.yt.refresh_auth():
                raise SetupError("YouTube authorization was revoked. Pair a new TV code.")
            # store_auth_state() in 3.4.0 uses an incompatible old format; serialize AuthState.
            save("youtube.json", self.yt.auth.serialize())
            if not await self.yt.connect():
                raise SetupError("YouTube receiver unavailable. Open native YouTube and reconnect.")
            self.yt_state.update(connected=True, receiverId=self.yt.auth.screen_id)
            self.yt_task = asyncio.create_task(self.yt_subscribe())
            await self.yt.get_now_playing()

    async def yt_subscribe(self):
        try:
            while self.yt and self.yt.connected():
                await self.yt.subscribe()
                await asyncio.sleep(.1)
        except asyncio.CancelledError:
            raise
        except Exception:
            pass
        finally:
            self.yt_state["connected"] = False

    async def xbox_init(self):
        if self.auth:
            return
        self.xsession = SignedSession()
        self.auth = AuthenticationManager(self.xsession, CLIENT_ID, "", REDIRECT)
        tokens = load("xbox.json")
        if tokens:
            self.auth.oauth = OAuth2TokenResponse.model_validate(tokens)
        self.xbox = XboxLiveClient(self.auth)

    async def xbox_ready(self):
        await self.xbox_init()
        if not self.auth.oauth:
            raise SetupError("Sign in to Xbox in setup first.")
        await self.auth.refresh_tokens()
        save("xbox.json", self.auth.oauth.model_dump(mode="json"))

    async def auth_start(self):
        await self.xbox_init()
        await self.auth_stop()
        self.auth_nonce = secrets.token_urlsafe(32)
        nonce = self.auth_nonce
        async def callback(request):
            if not secrets.compare_digest(request.query.get("state", ""), nonce):
                return web.Response(status=400, text="Invalid or expired sign-in state.")
            if self.auth_nonce != nonce:
                return web.Response(status=400, text="Sign-in already used.")
            self.auth_nonce = None
            if request.query.get("error") or not request.query.get("code"):
                return web.Response(status=400, text="Sign-in cancelled. Start again from setup.")
            try:
                async with asyncio.timeout(30):
                    await self.auth.request_tokens(request.query["code"])
                save("xbox.json", self.auth.oauth.model_dump(mode="json"))
                # Stop the callback after the browser receives its response.
                asyncio.get_running_loop().call_later(1, lambda: asyncio.create_task(self.auth_stop()))
                return web.Response(text="Xbox linked. Return to the Smart TV setup page.")
            except Exception:
                return web.Response(status=502, text="Xbox authorization failed. Start again from setup.")
        app = web.Application()
        app.router.add_get("/auth/callback", callback)
        self.auth_runner = web.AppRunner(app, access_log=None)
        await self.auth_runner.setup()
        await web.TCPSite(self.auth_runner, "127.0.0.1", 8080).start()
        self.auth_expiry = asyncio.get_running_loop().call_later(600, lambda: asyncio.create_task(self.auth_stop()))
        return dict(url=self.auth.generate_authorization_url(state=nonce))

    async def auth_stop(self):
        self.auth_nonce = None
        if self.auth_expiry:
            self.auth_expiry.cancel()
            self.auth_expiry = None
        if self.auth_runner:
            await self.auth_runner.cleanup()
            self.auth_runner = None

    async def state(self, include_xbox=True):
        tv = dict(connected=False, observedAt=0, appId=None, volume=None, soundOutput=None)
        async def read_tv():
            if not self.tv or not self.tv.is_connected():
                return
            try:
                async with asyncio.timeout(3):
                    app, volume = await asyncio.gather(self.tv.get_current_app(), self.tv.get_volume())
                tv.update(connected=True, observedAt=now(), appId=app, volume=volume, soundOutput=self.tv.tv_state.sound_output)
            except Exception:
                pass
        async def read_xbox():
            if not self.console_id or not self.auth or not self.auth.oauth:
                return
            # Cloud polling is rate-limited; retain the actual timestamp between reads.
            if now() - self.xbox_state["observedAt"] < 2000:
                return
            try:
                async with asyncio.timeout(4):
                    status = await self.xbox.smartglass.get_console_status(self.console_id)
                if status.status.error_code != "OK":
                    raise SetupError("Xbox status unavailable")
                product = next((p.one_store_product_id for p in self.products if p.aumid == status.focus_app_aumid), None)
                self.xbox_state.update(connected=True, observedAt=now(), activeTitle=product)
                save("xbox.json", self.auth.oauth.model_dump(mode="json"))
            except Exception:
                self.xbox_state["connected"] = False
        async def read_youtube():
            if self.yt and self.yt.connected() and self.yt_task and not self.yt_task.done():
                try:
                    async with asyncio.timeout(2):
                        await self.yt.get_now_playing()
                except Exception:
                    self.yt_state["connected"] = False
        readers = [read_tv(), read_youtube()]
        if include_xbox:
            readers.append(read_xbox())
        await asyncio.gather(*readers)
        return dict(tv=tv, youtube=self.yt_state.copy(), xbox=self.xbox_state.copy())

    async def dispatch(self, method, p):
        if method == "status":
            return dict(lgPaired=bool(load("lg.json")), youtubePaired=bool(load("youtube.json")), xboxAuthorized=bool(load("xbox.json")))
        if method == "state":
            return await self.state(p.get("includeXbox", True))
        if method == "tv.connect":
            await self.tv_connect(p.get("host"))
            try:
                self.apps = await self.tv.get_apps() or []
            except Exception as e:
                raise SetupError("LG app catalog: " + type(e).__name__) from e
            try:
                self.inputs = await self.tv.get_inputs() or []
            except Exception as e:
                raise SetupError("LG input catalog: " + type(e).__name__) from e
            warnings = []
            try:
                software = await self.tv.get_software_info()
            except WebOsTvResponseTypeError:
                # This TV rejects optional firmware metadata despite successful pairing/catalogs.
                software = {}
                warnings.append("TV software information unavailable; app and input discovery succeeded.")
            # Only retain non-identifying model/firmware fields.
            return dict(apps=[dict(id=a["id"], title=a.get("title", a["id"])) for a in self.apps],
                        inputs=[dict(id=i["id"], label=i.get("label", i["id"]), appId=i.get("appId", "")) for i in self.inputs],
                        info={k:v for k,v in software.items() if k in ("model_name", "major_ver", "minor_ver", "product_name")},
                        warnings=warnings)
        if method.startswith("tv."):
            if not self.tv or not self.tv.is_connected():
                raise SetupError("LG disconnected. Reconnect in setup.")
            if method == "tv.volume":
                return await self.tv.set_volume(int(p["level"]))
            if method == "tv.home":
                await self.tv.button("HOME")
                return True
            if method == "tv.input":
                if p["id"] not in [i["id"] for i in self.inputs]:
                    raise SetupError("Input not in the discovered LG catalog.")
                return await self.tv.set_input(p["id"])
            if method == "tv.launch":
                if p["id"] not in [a["id"] for a in self.apps]:
                    raise SetupError("App not in the discovered LG catalog.")
                return await self.tv.launch_app(p["id"])
        if method == "youtube.pair":
            async with self.yt_lock:
                await self.yt_init()
                if not await self.yt.pair(p["code"].replace(" ", "").replace("-", "")):
                    raise SetupError("TV code not accepted.")
                save("youtube.json", self.yt.auth.serialize())
            await self.yt_connect()
            return dict(paired=True)
        if method == "youtube.connect":
            await self.yt_connect()
            return True
        if method == "youtube.identity":
            if not self.yt or not self.yt.connected():
                raise SetupError("YouTube receiver disconnected.")
            return dict(receiverId=self.yt.auth.screen_id)
        if method in ("youtube.play", "youtube.pause", "youtube.resume"):
            if not self.yt or not self.yt.connected():
                raise SetupError("YouTube receiver disconnected.")
            action = self.yt.play_video(p["videoId"]) if method == "youtube.play" else self.yt.pause() if method == "youtube.pause" else self.yt.play()
            if not await action:
                raise SetupError("YouTube command rejected; reconnect the receiver.")
            return True
        if method == "xbox.auth":
            return await self.auth_start()
        if method in ("xbox.catalog", "xbox.launch", "xbox.home"):
            async with self.xbox_lock:
                await self.xbox_ready()
                if method == "xbox.catalog":
                    consoles = await self.xbox.smartglass.get_console_list()
                    self.console_id = p.get("consoleId") or self.console_id
                    if self.console_id:
                        if self.console_id not in [c.id for c in consoles.result]:
                            raise SetupError("Select a console from this account's catalog.")
                        apps = await self.xbox.smartglass.get_installed_apps(self.console_id)
                        self.products = apps.result
                    return dict(consoles=[dict(id=c.id, name=c.name) for c in consoles.result],
                                games=[dict(id=a.one_store_product_id, name=a.name) for a in self.products if a.one_store_product_id])
                if not self.console_id:
                    raise SetupError("Select an Xbox and load its installed games first.")
                if method == "xbox.launch":
                    if p["productId"] not in [a.one_store_product_id for a in self.products]:
                        raise SetupError("Game is not in the installed catalog.")
                    result = await self.xbox.smartglass.launch_app(self.console_id, p["productId"])
                else:
                    result = await self.xbox.smartglass.go_home(self.console_id)
                save("xbox.json", self.auth.oauth.model_dump(mode="json"))
                if result.status.error_code != "OK":
                    raise SetupError("Xbox rejected command. Check Remote features and account.")
                # Acceptance can precede a console-side failure. Inspect only this operation.
                operation_status = "Pending"
                for attempt in range(6):
                    report = await self.xbox.smartglass.get_op_status(self.console_id, result.op_id)
                    if report.status.error_code != "OK":
                        break
                    node = next((n for n in report.op_status_list if n.op_id == result.op_id), None)
                    if node:
                        operation_status = str(node.operation_status)
                        if operation_status == "Succeeded":
                            if not node.succeeded:
                                raise SetupError("Xbox command returned conflicting completion evidence.")
                            break
                        if operation_status in ("Error", "OffConsoleError", "TimedOut"):
                            raise SetupError("Xbox command did not complete: " + operation_status)
                    if attempt < 5:
                        await asyncio.sleep(1)
                return dict(accepted=True, operationStatus=operation_status)
        raise SetupError("Unknown device operation.")

    async def close(self):
        await self.auth_stop()
        if self.yt_task:
            self.yt_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.yt_task
        if self.yt:
            await self.yt.close()
        if self.tv:
            await self.tv.disconnect()
        if self.xsession:
            await self.xsession.aclose()

async def main():
    bridge = Bridge()
    tasks = {}
    async def handle(msg):
        try:
            async with asyncio.timeout(28):
                result = await bridge.dispatch(msg["method"], msg.get("params", {}))
            reply = dict(id=msg["id"], result=result)
        except asyncio.CancelledError:
            reply = dict(id=msg["id"], error="Operation cancelled.")
        except SetupError as e:
            reply = dict(id=msg["id"], error=str(e))
        except Exception as e:
            reply = dict(id=msg["id"], error=type(e).__name__ + ": device operation failed; check connection or pairing in setup.")
        print(json.dumps(reply), flush=True)
        tasks.pop(msg["id"], None)
    try:
        while line := await asyncio.to_thread(sys.stdin.readline):
            try:
                msg = json.loads(line)
                if "cancel" in msg:
                    if task := tasks.get(msg["cancel"]):
                        task.cancel()
                else:
                    tasks[msg["id"]] = asyncio.create_task(handle(msg))
            except (KeyError, ValueError):
                continue
    finally:
        for task in list(tasks.values()):
            task.cancel()
        await asyncio.gather(*tasks.values(), return_exceptions=True)
        await bridge.close()

if __name__ == "__main__":
    asyncio.run(main())
