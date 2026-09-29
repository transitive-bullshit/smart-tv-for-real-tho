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

    async def test_overlay_is_fixed_to_probe_and_refreshes_installed_apps(self):
        bridge = Bridge()
        bridge.tv = NS(
            is_connected=lambda: True,
            get_apps=AsyncMock(return_value=[]),
            launch_app=AsyncMock(return_value={"returnValue": True}),
            close_app=AsyncMock(return_value={"returnValue": True}),
        )
        with self.assertRaisesRegex(SetupError, "Install the TV overlay"):
            await bridge.dispatch("tv.overlay", {"action": "launch"})
        bridge.tv.launch_app.assert_not_awaited()
        overlay_id = "it.transitivebullsh.smarttv.overlayprobe"
        bridge.tv.get_apps.return_value = [{"id": overlay_id}]
        result = await bridge.dispatch("tv.overlay", {"action": "launch", "id": "unrelated.app"})
        self.assertEqual(result, {"accepted": True})
        bridge.tv.launch_app.assert_awaited_once_with(overlay_id)
        await bridge.dispatch("tv.overlay", {"action": "close", "id": "unrelated.app"})
        bridge.tv.close_app.assert_awaited_once_with(overlay_id)
        bridge.tv.close_app.return_value = {"returnValue": False}
        with self.assertRaisesRegex(SetupError, "did not confirm"):
            await bridge.dispatch("tv.overlay", {"action": "close"})
        with self.assertRaisesRegex(SetupError, "Unknown overlay action"):
            await bridge.dispatch("tv.overlay", {"action": "uninstall"})

    async def test_live_display_uses_launch_params_and_rejects_unknown_targets(self):
        bridge = Bridge()
        app_id = "it.transitivebullsh.smarttv.display"
        bridge.tv = NS(
            is_connected=lambda: True,
            get_apps=AsyncMock(return_value=[{"id": app_id}]),
            launch_app_with_params=AsyncMock(return_value={"returnValue": True}),
        )
        params = {"url": "http://192.168.1.2:3212/display/state", "token": "test-token"}
        result = await bridge.dispatch("tv.overlay", {"action": "launch", "target": "display", "params": params})
        bridge.tv.launch_app_with_params.assert_awaited_once_with(app_id, params)
        self.assertEqual(result, {"accepted": True})
        self.assertNotIn("test-token", str(result))
        with self.assertRaisesRegex(SetupError, "Unknown overlay target"):
            await bridge.dispatch("tv.overlay", {"action": "launch", "target": "unrelated"})

    async def test_youtube_close_has_fixed_target_and_requires_lg_acceptance(self):
        bridge = Bridge()
        bridge.tv = NS(is_connected=lambda: True, close_app=AsyncMock(return_value={"returnValue": True}))
        result = await bridge.dispatch("tv.close_youtube", {"id": "unrelated.app"})
        bridge.tv.close_app.assert_awaited_once_with("youtube.leanback.v4")
        self.assertEqual(result, {"accepted": True})
        bridge.tv.close_app.return_value = {"returnValue": False}
        with self.assertRaisesRegex(SetupError, "did not accept"):
            await bridge.dispatch("tv.close_youtube", {})

    async def test_youtube_status_recovers_after_transient_failure_without_freshening_playback(self):
        bridge = Bridge()
        bridge.yt_state.update(connected=True, receiverId="receiver", videoId="old-video", playback="Paused", observedAt=100)
        bridge.yt = NS(connected=lambda: True, get_now_playing=AsyncMock(side_effect=[TimeoutError(), True, False]))
        bridge.yt_task = NS(done=lambda: False)
        failed = await bridge.state(include_xbox=False)
        self.assertFalse(failed["youtube"]["connected"])
        bridge.yt_status_at -= 5000
        recovered = await bridge.state(include_xbox=False)
        self.assertTrue(recovered["youtube"]["connected"])
        self.assertEqual(recovered["youtube"]["observedAt"], 100)
        self.assertEqual(recovered["youtube"]["videoId"], "old-video")
        self.assertEqual(recovered["youtube"]["playback"], "Paused")
        bridge.yt_status_at -= 5000
        rejected = await bridge.state(include_xbox=False)
        self.assertFalse(rejected["youtube"]["connected"])

    async def test_youtube_status_ack_cannot_revive_ended_listener(self):
        bridge = Bridge()
        ended = False
        async def finish_listener():
            nonlocal ended
            ended = True
            return True
        bridge.yt_state.update(connected=True, observedAt=100)
        bridge.yt = NS(connected=lambda: True, get_now_playing=AsyncMock(side_effect=finish_listener))
        bridge.yt_task = NS(done=lambda: ended)
        state = await bridge.state(include_xbox=False)
        self.assertFalse(state["youtube"]["connected"])
        self.assertEqual(state["youtube"]["observedAt"], 100)

    async def test_old_youtube_read_cannot_disconnect_replacement_listener(self):
        bridge = Bridge()
        replacement = NS(done=lambda: False)
        async def reconnect_during_read():
            bridge.yt_task = replacement
            bridge.yt_state.update(connected=True, receiverId="replacement")
            raise TimeoutError()
        bridge.yt = NS(connected=lambda: True, get_now_playing=AsyncMock(side_effect=reconnect_during_read))
        bridge.yt_task = NS(done=lambda: False)
        state = await bridge.state(include_xbox=False)
        self.assertTrue(state["youtube"]["connected"])
        self.assertEqual(state["youtube"]["receiverId"], "replacement")

    async def test_repeated_state_reads_do_not_flood_receiver_or_freshen_cached_playback(self):
        bridge = Bridge()
        bridge.yt_state.update(connected=True, videoId="old", observedAt=100)
        bridge.yt = NS(connected=lambda: True, get_now_playing=AsyncMock(return_value=True))
        bridge.yt_task = NS(done=lambda: False)
        with patch("main.now", return_value=10000):
            await bridge.state(include_xbox=False)
            state = await bridge.state(include_xbox=False)
        self.assertEqual(bridge.yt.get_now_playing.await_count, 1)
        self.assertEqual(state["youtube"]["observedAt"], 100)
        with patch("main.now", return_value=15001):
            await bridge.state(include_xbox=False)
        self.assertEqual(bridge.yt.get_now_playing.await_count, 2)

    async def test_unconfigured_state_is_explicitly_disconnected(self):
        state = await Bridge().state()
        self.assertFalse(state["tv"]["connected"])
        self.assertFalse(state["youtube"]["connected"])
        self.assertFalse(state["xbox"]["connected"])

if __name__ == "__main__":
    unittest.main()

class SeekTests(unittest.IsolatedAsyncioTestCase):
    async def test_seek_validation_and_receiver_rejection(self):
        bridge = Bridge()
        bridge.yt = NS(connected=lambda: True, seek_to=AsyncMock(return_value=True))
        self.assertTrue(await bridge.dispatch('youtube.seek', {'seconds': 90}))
        bridge.yt.seek_to.assert_awaited_once_with(90)
        for seconds in (-1, float('nan'), float('inf'), True, '90', 86401):
            with self.assertRaises(SetupError):
                await bridge.dispatch('youtube.seek', {'seconds': seconds})
        bridge.yt.seek_to.return_value = False
        with self.assertRaises(SetupError):
            await bridge.dispatch('youtube.seek', {'seconds': 30})

    async def test_position_correlates_with_video_and_missing_data_clears_it(self):
        bridge = Bridge()
        listener = Listener(bridge)
        await listener.now_playing_changed(NS(video_id='one', state=NS(name='Playing'), current_time=90, duration=240))
        self.assertEqual(bridge.yt_state['positionSeconds'], 90)
        self.assertEqual(bridge.yt_state['durationSeconds'], 240)
        await listener.now_playing_changed(NS(video_id='two', state=NS(name='Playing'), current_time=None, duration=None))
        self.assertIsNone(bridge.yt_state['positionSeconds'])
        self.assertIsNone(bridge.yt_state['durationSeconds'])

class PlaybackControlsTests(unittest.IsolatedAsyncioTestCase):
    def fixture(self):
        bridge = Bridge()
        bridge.yt = NS(connected=lambda: True, set_playback_speed=AsyncMock(return_value=True), set_closed_captions=AsyncMock(return_value=True), set_auto_play_mode=AsyncMock(return_value=True), skip_ad=AsyncMock(return_value=True), next=AsyncMock(return_value=True), previous=AsyncMock(return_value=True), pause=AsyncMock(), play=AsyncMock())
        bridge.yt_state['videoId'] = 'current'
        return bridge

    async def test_settings_and_navigation_dispatch(self):
        b = self.fixture()
        await b.dispatch('youtube.speed', {'speed': 1.5})
        b.yt.set_playback_speed.assert_awaited_once_with(1.5)
        await b.dispatch('youtube.captions', {'language': 'en', 'videoId': 'current'})
        await b.dispatch('youtube.captions', {'language': None, 'videoId': 'current'})
        b.yt.set_closed_captions.assert_awaited_with(None, 'current')
        await b.dispatch('youtube.autoplay', {'enabled': False})
        b.yt.set_auto_play_mode.assert_awaited_once_with(False)
        await b.dispatch('youtube.next', {})
        await b.dispatch('youtube.previous', {})
        b.yt.next.assert_awaited_once()
        b.yt.previous.assert_awaited_once()

    async def test_settings_validation_and_rejection(self):
        b = self.fixture()
        for method, params in [('youtube.speed', {'speed': True}), ('youtube.speed', {'speed': 3}), ('youtube.autoplay', {'enabled': 'false'}), ('youtube.captions', {'language': 'en', 'videoId': 'old'})]:
            with self.assertRaises(SetupError):
                await b.dispatch(method, params)
        b.yt.set_playback_speed.return_value = False
        with self.assertRaises(SetupError):
            await b.dispatch('youtube.speed', {'speed': 1.5})

    async def test_ad_skip_requires_fresh_eligibility_and_consumes_it(self):
        b = self.fixture()
        with self.assertRaises(SetupError):
            await b.dispatch('youtube.skip_ad', {})
        await Listener(b).ad_state_changed(NS(is_skip_enabled=True))
        self.assertTrue(await b.dispatch('youtube.skip_ad', {}))
        with self.assertRaises(SetupError):
            await b.dispatch('youtube.skip_ad', {})
        b.ad_eligible, b.ad_observed_at = True, 1
        with self.assertRaises(SetupError):
            await b.dispatch('youtube.skip_ad', {})
        b.yt.skip_ad.assert_awaited_once()

    async def test_new_ad_and_disconnect_clear_skip_eligibility(self):
        b = self.fixture()
        listener = Listener(b)
        await listener.ad_state_changed(NS(is_skip_enabled=True))
        await listener.ad_playing_changed(object())
        self.assertFalse(b.ad_eligible)
        await listener.ad_state_changed(NS(is_skip_enabled=True))
        await listener.disconnected(object())
        self.assertFalse(b.ad_eligible)

class AmbientTests(unittest.IsolatedAsyncioTestCase):
    async def test_ambient_launch_is_fixed_validated_and_checks_acceptance(self):
        bridge = Bridge()
        app_id = "it.transitivebullsh.smarttv.ambient"
        bridge.tv = NS(
            is_connected=lambda: True,
            get_apps=AsyncMock(return_value=[{"id": app_id}]),
            launch_app_with_params=AsyncMock(return_value={"returnValue": True}),
            close_app=AsyncMock(return_value={"returnValue": True}),
        )
        await bridge.dispatch("tv.ambient", {"action": "launch", "guard": True, "id": "other.app"})
        bridge.tv.launch_app_with_params.assert_awaited_once_with(app_id, {"guard": True})
        await bridge.dispatch("tv.ambient", {"action": "launch"})
        bridge.tv.launch_app_with_params.assert_awaited_with(app_id, {})
        await bridge.dispatch("tv.ambient", {"action": "launch", "guard": False})
        bridge.tv.launch_app_with_params.assert_awaited_with(app_id, {"guard": False})
        with self.assertRaisesRegex(SetupError, "Invalid ambient"):
            await bridge.dispatch("tv.ambient", {"action": "launch", "guard": None})
        with self.assertRaisesRegex(SetupError, "Invalid ambient"):
            await bridge.dispatch("tv.ambient", {"action": "launch", "mode": "video"})
        bridge.tv.get_apps.return_value = []
        with self.assertRaisesRegex(SetupError, "Install Room Ambient"):
            await bridge.dispatch("tv.ambient", {"action": "launch"})
        bridge.tv.close_app.return_value = {"returnValue": False}
        with self.assertRaisesRegex(SetupError, "did not confirm"):
            await bridge.dispatch("tv.ambient", {"action": "close"})
        bridge.tv.close_app.assert_awaited_once_with(app_id)
