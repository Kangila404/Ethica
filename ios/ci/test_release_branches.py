"""Guard the main-only release boundary independently of signing credentials."""
import pathlib
import unittest


class ReleaseBranchesTests(unittest.TestCase):
    def test_production_workflows_only_release_main(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        for name in ("cd.ethica.yml", "ios-testflight.yml"):
            with self.subTest(workflow=name):
                source = (root / ".github" / "workflows" / name).read_text(encoding="utf-8")
                self.assertIn("branches: [main]", source)
                self.assertIn("if: github.ref == 'refs/heads/main'", source)
                self.assertNotIn("refs/heads/develop", source)
                self.assertNotIn("branches: [develop]", source)


if __name__ == "__main__":
    unittest.main()
