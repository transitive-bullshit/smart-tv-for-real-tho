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

Discovery initially returned no LG advertisements. The user subsequently supplied the TV network settings; its IP is saved in ignored local configuration. Direct pairing currently fails before the pairing prompt. The Mac has a neighbor entry for the supplied IP, but TCP connections to ports 3000, 3001 and 8008 returned “No route to host.” With user approval, Python.app Local Network access was enabled and verified in System Settings. Fresh processes from both Python installations and the app’s Node runtime still report host-unreachable on the TV control ports. An independent user-terminal check is pending to distinguish process attribution/permissions from TV or Wi-Fi reachability. The observed neighbor MAC differs by one byte from the user’s transcription, so TV identity still requires pairing/confirmation.
