// Read-only, app-scoped App Store Connect checks. Never logs keys/JWTs.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const bundleId = 'com.ethica.preview';
async function request(endpoint) {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = encode({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' }) + '.' +
    encode({ iss: process.env.ASC_ISSUER_ID, iat: now - 20, exp: now + 300, aud: 'appstoreconnect-v1' });
  const key = fs.readFileSync(path.join(process.env.RUNNER_TEMP, 'ethica-signing', `AuthKey_${process.env.ASC_KEY_ID}.p8`));
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  const response = await fetch('https://api.appstoreconnect.apple.com' + endpoint, {
    headers: { Authorization: 'Bearer ' + unsigned + '.' + signature }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`App Store Connect HTTP ${response.status}; check API key role, issuer and app access`);
  return response.json();
}
async function main() {
  const apps = await request('/v1/apps?' + new URLSearchParams({ 'filter[bundleId]': bundleId }));
  if (apps.data.length !== 1) throw new Error(`Expected one App Store Connect app with Bundle ID ${bundleId}`);
  const app = apps.data[0];
  console.log(`App record verified: ${app.attributes.name} (${bundleId})`);
  if (process.argv[2] === 'check') return;
  if (process.argv[2] !== 'processing') throw new Error('Use check or processing');
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await request('/v1/builds?' + new URLSearchParams({
      'filter[app]': app.id, 'filter[version]': process.env.BUILD_NUMBER, limit: '10',
    }));
    const build = result.data[0];
    if (build) {
      const state = build.attributes.processingState;
      console.log(`Build ${process.env.BUILD_NUMBER}: ${state}`);
      if (state === 'VALID') {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
          `\nBuild ${process.env.BUILD_NUMBER} has finished Apple processing. Open TestFlight in App Store Connect. Export-compliance questions and tester access may still be required. No App Review submission was made.\n`);
        return;
      }
      if (['FAILED', 'INVALID'].includes(state)) throw new Error('Apple processing failed; inspect build details/email');
    } else console.log('Upload accepted; waiting for Apple to list the build.');
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '\nUpload finished, but Apple processing has not finished within 10 minutes. Check TestFlight later; do not treat this as an installable build yet.\n');
  console.log('::warning::Apple processing still pending.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
