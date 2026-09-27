import unittest
from unittest.mock import AsyncMock
from pyytlounge.wrapper import YtLoungeApi
from main import Bridge, Listener

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

    async def test_unconfigured_state_is_explicitly_disconnected(self):
        state = await Bridge().state()
        self.assertFalse(state["tv"]["connected"])
        self.assertFalse(state["youtube"]["connected"])
        self.assertFalse(state["xbox"]["connected"])

if __name__ == "__main__":
    unittest.main()
