"""Remove only files created by prepare-signing on the disposable runner."""
import json
import os
from pathlib import Path
import shutil
import subprocess

root = Path(os.environ["RUNNER_TEMP"]).resolve()
state = root / "ethica-signing"
if state.is_dir() and not state.is_symlink():
    manifest = state / "installed-profiles.json"
    if manifest.exists():
        allowed = (Path.home() / "Library/Developer/Xcode/UserData/Provisioning Profiles").resolve()
        for item in json.loads(manifest.read_text()):
            profile = Path(item).resolve()
            if profile.parent != allowed or profile.suffix != ".mobileprovision":
                raise RuntimeError("Unexpected cleanup target")
            profile.unlink(missing_ok=True)
    keychain = state / "signing.keychain-db"
    if keychain.exists():
        subprocess.run(["security", "delete-keychain", str(keychain)], capture_output=True)
    shutil.rmtree(state)
