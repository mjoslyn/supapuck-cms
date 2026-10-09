// Addresses Compose's link reader must refuse, and ones it must not.
//   npx tsx scripts/checks/private-address.ts
import { privateAddress } from '../../src/lib/compose/private-address';

let bad = 0;
const want = (ip: string, expected: boolean) => {
  const ok = privateAddress(ip) === expected;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${ip} ${expected ? 'refused' : 'allowed'}`);
};
for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fd00::1', 'fe80::1', 'febf::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a9fe:a9fe', '64:ff9b::7f00:1', 'not-an-ip']) want(ip, true);
for (const ip of ['8.8.8.8', '172.32.0.1', '100.128.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) want(ip, false);
// What a URL makes of an IPv4 address written as IPv6.
want(new URL('http://[::ffff:127.0.0.1]/').hostname.replace(/^\[|\]$/g, ''), true);
process.exitCode = bad ? 1 : 0;
