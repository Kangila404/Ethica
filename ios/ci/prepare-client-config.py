"""Validate client-only settings, then materialize ignored Xcode inputs.

CI: IOS_CLIENT_CONFIG_JSON contains the JSON object described by the example.
Mac: python3 ios/ci/prepare-client-config.py --config /secure/client-config.json
Never include server credentials, OAuth client secrets, or APNs private keys.

Mac handoff: transfer the client JSON separately, not through Git. The generated
file is shared by Debug/Release; local xcconfig overrides still take precedence.
For simulator access to the deployed API set the launch environment ETHICA_API_URL
to https://ethica.kro.kr/api/ (Debug otherwise uses localhost).
Before testing Google, the server GOOGLE_CLIENT_IDS must include both iOS and Web
IDs for aud/azp verification. KAKAO_CLIENT_IDS must include the native app key.
APNs key registration in Firebase and real-device delivery remain separate checks.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import plistlib
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
FIELDS = {"google_ios_client_id", "google_server_client_id", "kakao_native_app_key", "firebase_plist_base64"}


def validate(config):
    if not isinstance(config, dict) or set(config) != FIELDS:
        raise ValueError("Client configuration must contain exactly the four documented fields")
    for key in FIELDS:
        if not isinstance(config[key], str) or not config[key].strip():
            raise ValueError("Missing client configuration field: " + key)
    ios_id = config["google_ios_client_id"]
    server_id = config["google_server_client_id"]
    pattern = r"([0-9]+)-[a-z0-9]+\.apps\.googleusercontent\.com"
    ios_match = re.fullmatch(pattern, ios_id)
    server_match = re.fullmatch(pattern, server_id)
    if not ios_match or not server_match:
        raise ValueError("Invalid Google client ID format")
    if ios_id == server_id or ios_match[1] != server_match[1]:
        raise ValueError("Use distinct iOS and Web clients from the same Google project")
    kakao_key = config["kakao_native_app_key"]
    if not re.fullmatch(r"[a-f0-9]{32}", kakao_key):
        raise ValueError("Invalid Kakao native app key format")
    try:
        raw = base64.b64decode(config["firebase_plist_base64"], validate=True)
        firebase = plistlib.loads(raw)
    except Exception:
        raise ValueError("Invalid Firebase client plist encoding") from None
    if not isinstance(firebase, dict):
        raise ValueError("Firebase client plist must be a dictionary")
    if firebase.get("BUNDLE_ID") != "com.ethica.preview":
        raise ValueError("Firebase bundle ID must match the main app")
    if firebase.get("PROJECT_ID") != "ethica-e661c":
        raise ValueError("Unexpected Firebase push project")
    for key in ("GOOGLE_APP_ID", "GCM_SENDER_ID", "API_KEY"):
        if not isinstance(firebase.get(key), str) or not firebase[key].strip():
            raise ValueError("Firebase client plist is missing " + key)
    # Google native login and Firebase Messaging intentionally use separate projects.
    reversed_id = ".".join(reversed(ios_id.split(".")))
    xcconfig = "\n".join([
        "// Generated client configuration. Do not commit.",
        "GOOGLE_IOS_CLIENT_ID = " + ios_id,
        "GOOGLE_SERVER_CLIENT_ID = " + server_id,
        "GOOGLE_REVERSED_CLIENT_ID = " + reversed_id,
        "KAKAO_NATIVE_APP_KEY = " + kakao_key,
        "",
    ])
    return xcconfig, raw


def install(config, root=ROOT):
    xcconfig, raw = validate(config)
    targets = {
        root / "ios/Configuration/Client.generated.xcconfig": xcconfig.encode(),
        root / "ios/Ethica/Resources/GoogleService-Info.plist": raw,
    }
    # Fail before touching anything if a Mac already has different local settings.
    for path, data in targets.items():
        if path.is_symlink() or (path.exists() and path.read_bytes() != data):
            raise ValueError("Existing local client configuration differs; back it up before regenerating")
    for path, data in targets.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            with path.open("xb") as handle:
                handle.write(data)
            path.chmod(0o600)


def verify_app(config, app):
    _, raw = validate(config)
    info = plistlib.loads((app / "Info.plist").read_bytes())
    expected = {
        "CFBundleIdentifier": "com.ethica.preview",
        "GIDClientID": config["google_ios_client_id"],
        "GIDServerClientID": config["google_server_client_id"],
        "KakaoNativeAppKey": config["kakao_native_app_key"],
    }
    if any(info.get(key) != value for key, value in expected.items()):
        raise ValueError("Archived app provider settings do not match validated configuration")
    schemes = {scheme for entry in info.get("CFBundleURLTypes", []) for scheme in entry.get("CFBundleURLSchemes", [])}
    required = {".".join(reversed(config["google_ios_client_id"].split("."))), "kakao" + config["kakao_native_app_key"]}
    if not required.issubset(schemes):
        raise ValueError("Archived app is missing provider callback URL schemes")
    if plistlib.loads((app / "GoogleService-Info.plist").read_bytes()) != plistlib.loads(raw):
        raise ValueError("Archived Firebase configuration differs from validated input")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path)
    parser.add_argument("--verify-app", type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    try:
        source = args.config.read_text(encoding="utf-8-sig") if args.config else os.environ.get("IOS_CLIENT_CONFIG_JSON", "")
        if not source:
            raise ValueError("IOS_CLIENT_CONFIG_JSON is required for TestFlight builds")
        try:
            config = json.loads(source)
        except ValueError:
            raise ValueError("Client configuration must be valid JSON") from None
        if args.verify_app:
            verify_app(config, args.verify_app)
        else:
            install(config)
    except (ValueError, OSError) as error:
        print("Client configuration failed: " + str(error), file=sys.stderr)
        return 1
    print("Client configuration verified" if args.verify_app else "Validated client configuration installed (values omitted).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
