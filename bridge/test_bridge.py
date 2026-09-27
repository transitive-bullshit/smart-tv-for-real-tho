import unittest
from unittest.mock import AsyncMock, patch
from types import SimpleNamespace as NS
from pyytlounge.wrapper import YtLoungeApi
from main import Bridge, Listener, SetupError
from aiowebostv.exceptions import WebOsTvResponseTypeError

class BridgeTests(unittest.IsolatedAsyncioTestCase):
    async def test_saved_youtube_auth_round_trip(self):
        # Regression: wrapper.store_auth_state and load_auth_state disagree in 3.4.0.
        a, b = YtLoungeApi("a"), YtLoungeApi("b")
        a.auth.screen_id = "test-screen"
        a.auth.lounge_id_token = "test-token"
        b.load_auth_state(a.auth.serialize())
        self.assertEqual(b.auth.screen_id, "test-screen")
        self.assertTrue(b.paired())

    async def test_playback_event_cannot_reuse_stale_video_id(self):
        bridge = Bridge()
        bridge.yt = AsyncMock()
        bridge.yt_state.update(videoId="old", observedAt=100)
        await Listener(bridge).playback_state_changed(object())
        bridge.yt.get_now_playing.assert_awaited_once()
        self.assertEqual(bridge.yt_state["observedAt"], 100)

    async def test_optional_software_metadata_does_not_block_real_catalogs(self):
        bridge = Bridge()
        bridge.tv_connect = AsyncMock()
        bridge.tv = AsyncMock()
        bridge.tv.get_apps.return_value = [{"id": "youtube.leanback.v4", "title": "YouTube"}]
        bridge.tv.get_inputs.return_value = [{"id": "HDMI_3", "label": "HDMI 3", "appId": "com.webos.app.hdmi3"}]
        bridge.tv.get_software_info.side_effect = WebOsTvResponseTypeError({"type": "error"})
        result = await bridge.dispatch("tv.connect", {})
        self.assertEqual(result["apps"][0]["id"], "youtube.leanback.v4")
        self.assertEqual(result["inputs"][0]["id"], "HDMI_3")
        self.assertEqual(result["info"], {})
        self.assertEqual(len(result["warnings"]), 1)

    async def test_required_app_catalog_failure_remains_a_failure(self):
        bridge = Bridge()
        bridge.tv_connect = AsyncMock()
        bridge.tv = AsyncMock()
        bridge.tv.get_apps.side_effect = WebOsTvResponseTypeError({"type": "error"})
        with self.assertRaisesRegex(SetupError, "LG app catalog"):
            await bridge.dispatch("tv.connect", {})
        bridge.tv.get_inputs.assert_not_awaited()

    async def test_xbox_console_failure_after_acceptance_is_not_success(self):
        bridge = Bridge()
        bridge.xbox_ready = AsyncMock()
        bridge.console_id = "console"
        bridge.products = [NS(one_store_product_id="game")]
        bridge.auth = NS(oauth=NS(model_dump=lambda **kwargs: {}))
        bridge.xbox = NS(smartglass=NS(
            launch_app=AsyncMock(return_value=NS(status=NS(error_code="OK"), op_id="this-op")),
            get_op_status=AsyncMock(return_value=NS(status=NS(error_code="OK"), op_status_list=[
                NS(op_id="other-op", operation_status="Succeeded", succeeded=True),
                NS(op_id="this-op", operation_status="OffConsoleError", succeeded=False),
            ])),
        ))
        with patch("main.save"):
            with self.assertRaisesRegex(SetupError, "OffConsoleError"):
                await bridge.dispatch("xbox.launch", {"productId": "game"})

    async def test_xbox_completion_must_match_the_requested_operation(self):
        bridge = Bridge()
        bridge.xbox_ready = AsyncMock()
        bridge.console_id = "console"
        bridge.products = [NS(one_store_product_id="game")]
        bridge.auth = NS(oauth=NS(model_dump=lambda **kwargs: {}))
        done = NS(op_id="this-op", operation_status="Succeeded", succeeded=True)
        poll = AsyncMock(side_effect=[
            NS(status=NS(error_code="OK"), op_status_list=[
                NS(op_id="other-op", operation_status="Succeeded", succeeded=True),
                NS(op_id="this-op", operation_status="Pending", succeeded=False),
            ]),
            NS(status=NS(error_code="OK"), op_status_list=[done]),
        ])
        bridge.xbox = NS(smartglass=NS(
            launch_app=AsyncMock(return_value=NS(status=NS(error_code="OK"), op_id="this-op")),
            get_op_status=poll,
        ))
        with patch("main.save"), patch("main.asyncio.sleep", new_callable=AsyncMock):
            result = await bridge.dispatch("xbox.launch", {"productId": "game"})
        self.assertEqual(poll.await_count, 2)
        self.assertEqual(result, {"accepted": True, "operationStatus": "Succeeded"})
        done.succeeded = False
        poll.side_effect = None
        poll.return_value = NS(status=NS(error_code="OK"), op_status_list=[done])
        with patch("main.save"):
            with self.assertRaisesRegex(SetupError, "conflicting completion"):
                await bridge.dispatch("xbox.launch", {"productId": "game"})

    async def test_unconfigured_state_is_explicitly_disconnected(self):
        state = await Bridge().state()
        self.assertFalse(state["tv"]["connected"])
        self.assertFalse(state["youtube"]["connected"])
        self.assertFalse(state["xbox"]["connected"])

if __name__ == "__main__":
    unittest.main()
