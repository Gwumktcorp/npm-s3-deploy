import Cloudflare from 'cloudflare';
import fs from 'node:fs/promises';
import path from 'path';
import { HOME_DIR } from './utils.js';

let client = new Cloudflare();

export function setupClient(token) {
	client = new Cloudflare({ token });
}

export function addZone(name) {
	return client.zones.add({ name, jump_start: true });
}

export async function findZoneByName(name) {
	const { result } = await client.zones.browse({ name });
	return result[0];
}

export async function upsertZone(name) {
	try {
		return await addZone(name);
	} catch (err) {
		return await findZoneByName(name);
	}
}

export function deleteZone(name) {
	return client.zones.del(name);
}

export function alwaysUseHttps(zoneId) {
	return client.zoneSettings.edit(zoneId, 'always_use_https', { value: 'on' });
}

export function changeSSLSetting(zoneId, value) {
	return client.zoneSettings.edit(zoneId, 'ssl', { value });
}

/**
 *
 * @param {string} zoneId
 * @param {Cloudflare.DnsRecord} record
 */
export function addRecord(zoneId, record) {
	return client.dnsRecords.add(zoneId, record);
}

/**
 *
 * @param {string} zoneId
 * @param {Cloudflare.DnsRecord} record
 */
export async function upsertRecord(zoneId, record) {
	try {
		return await addRecord(zoneId, record);
	} catch (err) {
		const { result } = await client.dnsRecords.browse(zoneId);

		const recordName = record.name === '@' ? '' : record.name + '.';
		const matchRecord = findRecrod();
		if (!matchRecord) return;

		return await client.dnsRecords.edit(zoneId, matchRecord.id, record);

		function findRecrod() {
			const TYPE_RELATIVE = ['A', 'CNAME'];
			return result.find(item => {
				let isTypeMatch = TYPE_RELATIVE.includes(record.type) ? TYPE_RELATIVE.includes(item.type) : item.type === record.type;
				let isNameMatch = item.name === recordName + item.zone_name;
				return isTypeMatch && isNameMatch;
			});
		}
	}
}

export async function getCloudflareKeysFile() {
	const file = await fs.readFile(path.join(HOME_DIR, '.cloudflare/keys.json')).catch(() => {});
	return file ? JSON.parse(file) : {};
}

export async function saveCloudflareKeysFile(data) {
	await fs.writeFile(path.join(HOME_DIR, '.cloudflare/keys.json'), JSON.stringify(data));
}

export function addPageRule(zoneId, name) {
	return client.pageRules
		.add(zoneId, {
			status: 'active',
			priority: 1,
			actions: [
				{
					id: 'forwarding_url',
					value: {
						status_code: 301,
						url: `https://${name}`,
					},
				},
			],
			targets: [
				{
					target: 'url',
					constraint: {
						operator: 'matches',
						value: `www.${name}/*`,
					},
				},
			],
		})
		.catch(() => {});
}
