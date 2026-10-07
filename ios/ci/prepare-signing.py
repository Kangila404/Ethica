"""Prepare signing only on a disposable GitHub-hosted macOS runner."""
import base64
import datetime
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import secrets
import subprocess
import sys


def run(*args):
    result = subprocess.run(args, capture_output=True, check=False)
    if result.returncode:
        # Security tools may echo their arguments; never print their raw errors.
        raise RuntimeError(f"{args[0]} {args[1]} failed ({result.returncode})")
    return result.stdout


def required(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"Missing GitHub secret: {name}")
    return value


def main():
    if sys.platform != "darwin" or os.environ.get("GITHUB_ACTIONS") != "true":
        raise RuntimeError("Signing is limited to the hosted macOS workflow")
    os.umask(0o077)
    state = Path(os.environ["RUNNER_TEMP"]) / "ethica-signing"
    state.mkdir(exist_ok=False)
    team = required("IOS_TEAM_ID")
    if not re.fullmatch(r"[A-Z0-9]{10}", team):
        raise ValueError("Invalid team ID")
    p12 = state / "distribution.p12"
    p12.write_bytes(base64.b64decode(required("IOS_DISTRIBUTION_P12_BASE64"), validate=True))
    keychain = state / "signing.keychain-db"
    password = secrets.token_urlsafe(32)
    run("security", "create-keychain", "-p", password, str(keychain))
    run("security", "set-keychain-settings", "-lut", "21600", str(keychain))
    run("security", "unlock-keychain", "-p", password, str(keychain))
    run("security", "import", str(p12), "-P", required("IOS_DISTRIBUTION_P12_PASSWORD"),
        "-A", "-t", "cert", "-f", "pkcs12", "-k", str(keychain))
    run("security", "set-key-partition-list", "-S", "apple-tool:,apple:,codesign:",
        "-s", "-k", password, str(keychain))
    run("security", "list-keychains", "-d", "user", "-s", str(keychain))
    identities = run("security", "find-identity", "-v", "-p", "codesigning", str(keychain)).decode()
    profiles = {}
    installed = []
    cert_hash = None
    profile_dir = Path.home() / "Library/Developer/Xcode/UserData/Provisioning Profiles"
    profile_dir.mkdir(parents=True, exist_ok=True)
    for bundle, env in [("com.ethica.preview", "IOS_APP_PROFILE_BASE64"),
                        ("com.ethica.preview.widget", "IOS_WIDGET_PROFILE_BASE64")]:
        raw = base64.b64decode(required(env), validate=True)
        path = state / f"{bundle}.mobileprovision"
        path.write_bytes(raw)
        profile = plistlib.loads(run("security", "cms", "-D", "-i", str(path)))
        ent = profile["Entitlements"]
        if profile["TeamIdentifier"] != [team] or ent["application-identifier"] != f"{team}.{bundle}":
            raise ValueError(f"Wrong profile identity for {bundle}")
        if (profile["ExpirationDate"] <= datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
                or profile.get("ProvisionedDevices") or profile.get("ProvisionsAllDevices")
                or ent.get("get-task-allow", True)):
            raise ValueError(f"Not a valid App Store profile: {bundle}")
        if "group.com.ethica.preview" not in ent.get("com.apple.security.application-groups", []):
            raise ValueError(f"App Group missing: {bundle}")
        if bundle == "com.ethica.preview" and (ent.get("aps-environment") != "production"
                or ent.get("com.apple.developer.applesignin") != ["Default"]):
            raise ValueError("App profile requires production Push and Sign in with Apple")
        matches = [hashlib.sha1(c).hexdigest().upper() for c in profile["DeveloperCertificates"]
                   if hashlib.sha1(c).hexdigest().upper() in identities]
        if not matches or (cert_hash and cert_hash not in matches):
            raise ValueError("Profile does not match imported signing identity")
        cert_hash = cert_hash or matches[0]
        uuid = profile["UUID"]
        if not re.fullmatch(r"[A-Fa-f0-9-]{36}", uuid):
            raise ValueError("Invalid profile UUID")
        destination = profile_dir / f"{uuid}.mobileprovision"
        if destination.exists():
            raise ValueError("Refusing to replace an existing profile")
        destination.write_bytes(raw)
        installed.append(str(destination))
        (state / "installed-profiles.json").write_text(json.dumps(installed))
        profiles[bundle] = uuid
        print(f"Validated App Store profile: {bundle}")

    # Apply per-target profiles only in this disposable checkout. A global
    # PROVISIONING_PROFILE_SPECIFIER would incorrectly sign the widget as the app.
    project_path = Path("ios/Ethica.xcodeproj/project.pbxproj")
    project = json.loads(run("plutil", "-convert", "json", "-o", "-", str(project_path)))
    found = set()
    for obj in project["objects"].values():
        if obj.get("isa") != "XCBuildConfiguration" or obj.get("name") != "Release":
            continue
        settings = obj.get("buildSettings", {})
        bundle = settings.get("PRODUCT_BUNDLE_IDENTIFIER")
        if bundle in profiles:
            settings.update(CODE_SIGN_STYLE="Manual", DEVELOPMENT_TEAM=team,
                            CODE_SIGN_IDENTITY=cert_hash,
                            PROVISIONING_PROFILE_SPECIFIER=profiles[bundle])
            found.add(bundle)
    if found != set(profiles):
        raise ValueError("App and widget Release targets not both found")
    project_path.write_bytes(plistlib.dumps(project))
    run("plutil", "-lint", str(project_path))
    options = dict(method="app-store-connect", destination="export", teamID=team,
                   signingStyle="manual", signingCertificate=cert_hash,
                   provisioningProfiles=profiles, manageAppVersionAndBuildNumber=False,
                   uploadSymbols=True, stripSwiftSymbols=True)
    (state / "ExportOptions.plist").write_bytes(plistlib.dumps(options))

    key_id = required("ASC_KEY_ID")
    if not re.fullmatch(r"[A-Z0-9]{10}", key_id):
        raise ValueError("Invalid ASC_KEY_ID")
    private_key = required("ASC_PRIVATE_KEY")
    if "-----BEGIN PRIVATE KEY-----" not in private_key or "\n" not in private_key:
        raise ValueError("ASC_PRIVATE_KEY must contain the raw multiline .p8, not base64")
    (state / f"AuthKey_{key_id}.p8").write_text(private_key + "\n")
    print("Signing prepared; no certificates or profiles were changed in Apple Developer.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"::error::{error}")
        sys.exit(1)
