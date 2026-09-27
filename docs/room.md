# Room setup

User-confirmed September 28, 2026:

- LG model: **86UA8450PSA** (model code 86UA8450PSA.CTMFBH).
- Platform: **webOS 25**.
- Software: **33.31.61**.
- Xbox Series X: **HDMI 3**.
- Soundbar: **HDMI 2**; model and volume/ARC behavior still need testing.
- TV on 2.4 GHz Wi-Fi; Mac moved to the same network for discovery.
- LG ThinQ Home Hub is present. A separate Home Assistant installation was not reported.

The user's screenshot establishes identity and software only, not protocol or HUD compatibility. Serial number intentionally omitted. Local IP and credentials belong in ignored .local configuration.

The user launched pnpm dev from their own Terminal and accepted the LG pairing prompt. This resolved controller network access; Codex-launched Python/Node processes could not reach the same TV. Keep the controller in that Terminal. Python.app Local Network access was enabled with user approval, but was insufficient for Codex-launched processes.

Live TV discovery confirms:

- YouTube: youtube.leanback.v4.
- Xbox input: HDMI_3, app com.webos.app.hdmi3, label “XBOX Game Console.”
- HDMI 2 label: “LG Sound Bar.”
- Current snapshot at setup: LG Home, volume 10, sound output external_arc. Physical audio/volume effects are still untested.
- Pairing key reconnects after bridge restart.

The optional software-information request is rejected by this firmware; the app reports that as a warning without discarding working app/input discovery. Model/firmware facts above come from the user screenshot. YouTube receiver pairing now succeeds; the actual receiver has reported requested-video replacement and pause/resume. Physical picture/sound confirmation and receiver restart/cold-app checks remain pending. Xbox account authorization is still pending.
