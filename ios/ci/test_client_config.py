import base64
import importlib.util
from pathlib import Path
import plistlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("client_config", Path(__file__).with_name("prepare-client-config.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fixture():
    firebase = {"BUNDLE_ID": "com.ethica.preview", "PROJECT_ID": "ethica-e661c", "GOOGLE_APP_ID": "1:456:ios:test", "GCM_SENDER_ID": "456", "API_KEY": "test-only"}
    return {
        "google_ios_client_id": "123-ios.apps.googleusercontent.com",
        "google_server_client_id": "123-web.apps.googleusercontent.com",
        "kakao_native_app_key": "a" * 32,
        "firebase_plist_base64": base64.b64encode(plistlib.dumps(firebase)).decode(),
    }


class ClientConfigTests(unittest.TestCase):
    def test_valid_separate_google_and_firebase_projects(self):
        text, _ = module.validate(fixture())
        self.assertIn("GOOGLE_SERVER_CLIENT_ID = 123-web.apps.googleusercontent.com", text)
        self.assertIn("GOOGLE_REVERSED_CLIENT_ID = com.googleusercontent.apps.123-ios", text)

    def test_reject_missing_and_extra_fields(self):
        for key in fixture():
            config = fixture()
            del config[key]
            with self.assertRaises(ValueError):
                module.validate(config)
        config = fixture()
        config["private_key"] = "must never be accepted"
        with self.assertRaises(ValueError):
            module.validate(config)

    def test_reject_invalid_clients_and_config_injection(self):
        for key, value in [("google_ios_client_id", "123-ios.apps.googleusercontent.com\nEVIL = yes"), ("google_server_client_id", "999-web.apps.googleusercontent.com"), ("google_server_client_id", fixture()["google_ios_client_id"]), ("kakao_native_app_key", "bad"), ("firebase_plist_base64", "invalid!")]:
            config = fixture()
            config[key] = value
            with self.assertRaises(ValueError):
                module.validate(config)

    def test_reject_wrong_firebase_target_or_missing_fields(self):
        for key, value in [("BUNDLE_ID", "com.ethica.preview.widget"), ("PROJECT_ID", "wrong"), ("API_KEY", ""), ("GOOGLE_APP_ID", ""), ("GCM_SENDER_ID", "")]:
            config = fixture()
            firebase = plistlib.loads(base64.b64decode(config["firebase_plist_base64"]))
            firebase[key] = value
            config["firebase_plist_base64"] = base64.b64encode(plistlib.dumps(firebase)).decode()
            with self.assertRaises(ValueError):
                module.validate(config)

    def test_install_idempotent_and_preserves_local_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            module.install(fixture(), root)
            module.install(fixture(), root)
            path = root / "ios/Configuration/Client.generated.xcconfig"
            path.write_text("user settings")
            with self.assertRaises(ValueError):
                module.install(fixture(), root)
            self.assertEqual(path.read_text(), "user settings")

    def test_archive_verification(self):
        config = fixture()
        with tempfile.TemporaryDirectory() as directory:
            app = Path(directory)
            info = {"CFBundleIdentifier": "com.ethica.preview", "GIDClientID": config["google_ios_client_id"], "GIDServerClientID": config["google_server_client_id"], "KakaoNativeAppKey": config["kakao_native_app_key"], "CFBundleURLTypes": [{"CFBundleURLSchemes": ["com.googleusercontent.apps.123-ios", "kakao" + config["kakao_native_app_key"]]}]}
            (app / "Info.plist").write_bytes(plistlib.dumps(info))
            (app / "GoogleService-Info.plist").write_bytes(base64.b64decode(config["firebase_plist_base64"]))
            module.verify_app(config, app)
            info["GIDServerClientID"] = ""
            (app / "Info.plist").write_bytes(plistlib.dumps(info))
            with self.assertRaises(ValueError):
                module.verify_app(config, app)


if __name__ == "__main__":
    unittest.main()
