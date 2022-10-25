#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createBucket, createBucketWebsiteHosting, addFileToBucket, emptyBucket } from './s3.js';
import mime from 'mime';
import fastGlob from 'fast-glob';
import { upsertZone, upsertRecord, alwaysUseHttps, changeSSLSetting, createHiddenDir, getCloudflareKeysFile, saveCloudflareKeysFile, setupClient, addPageRule } from './cloudflare.js';
import inquirer from 'inquirer';
import path from 'path';

const AWS_REGION = 'eu-central-1';
const DIR = path.basename(process.cwd());
const BUCKET_DOMAIN = `${DIR}.s3-website.${AWS_REGION}.amazonaws.com`;

async function setup() {
	const { actions } = await inquirer.prompt({
		type: 'checkbox',
		name: 'actions',
		message: 'Select actions',
		choices: [
			{
				name: 'Setup Cloudflare domain',
				value: setupCloudflare,
				checked: true,
			},
			{
				name: 'Setup AWS Bucket',
				value: setupAWSBucket,
				checked: true,
			},
		],
	});

	try {
		for (const fn of actions) {
			await fn();
		}
	} catch (err) {
		console.log(err.message);
	}
}

async function chooseCloudflareAccount() {
	const cloudflareKeys = await getCloudflareKeysFile();
	if (!Object.keys(cloudflareKeys).length) throw new Error('You must setup cloudflare auth first');

	const { cloudflareToken } = await inquirer.prompt([
		{
			type: 'list',
			name: 'cloudflareToken',
			message: 'Select Cloudflare account',
			choices: Object.entries(cloudflareKeys).map(([name, value]) => ({ name, value })),
		},
	]);

	return { cloudflareToken };
}

async function deploy() {
	try {
		const { pathInput } = await inquirer.prompt({
			type: 'input',
			name: 'pathInput',
			message: 'Path',
			default: '/',
		});

		const files = await fastGlob(`./${pathInput}/**`);
		const filesData = await Promise.all(files.map(path => fs.readFile(path)));
		await emptyBucket(DIR);

		const promises = files.map(async (filePath, i) => {
			const fileData = filesData[i];
			if (pathInput !== '/') {
				filePath = filePath.slice(filePath.indexOf(pathInput) + pathInput.length + 1);
			}
			await addFileToBucket({
				bucketName: DIR,
				fileName: filePath,
				fileData,
				contentType: mime.getType(filePath),
			});
			console.log(`added ${filePath}`);
		});
		await Promise.all(promises);
		console.log(`\n ✅ BUCKET DOMAIN: http://${BUCKET_DOMAIN}`);
	} catch (err) {
		console.log(err.message);
	}
}

async function setupAWSBucket() {
	console.log('setting aws bucket');
	await createBucket(DIR);
	await createBucketWebsiteHosting(DIR);
}

async function setupCloudflare() {
	const { cloudflareToken } = await chooseCloudflareAccount();

	console.log('setting cloudflare');
	setupClient(cloudflareToken);
	try {
		const zone = await upsertZone(DIR);
		if (!zone) throw new Error('Zone is not exists');

		await Promise.all([
			upsertRecord(zone.id, { type: 'CNAME', name: '@', content: BUCKET_DOMAIN, proxied: true }), //
			upsertRecord(zone.id, { type: 'CNAME', name: 'www', content: '@', proxied: true }),
			alwaysUseHttps(zone.id),
			changeSSLSetting(zone.id, 'flexible'),
			addPageRule(zone.id, DIR),
		]);
	} catch (err) {
		console.error(err);
	}
}

async function setupCloudflareAuth() {
	const { name, token } = await inquirer.prompt([
		{ type: 'input', name: 'name', message: 'Account name' },
		{ type: 'input', name: 'token', message: 'Token' },
	]);

	await createHiddenDir();

	const keys = await getCloudflareKeysFile();
	Object.assign(keys, { [name]: token });
	await saveCloudflareKeysFile(keys);
}

async function main() {
	const { action: handler } = await inquirer.prompt([
		{
			type: 'list',
			name: 'action',
			message: `Select action (${DIR})`,
			choices: [
				{
					name: 'Deploy website',
					value: deploy,
				},
				{
					name: 'Setup website',
					value: setup,
				},
				{
					name: 'Setup Cloudflare auth',
					value: setupCloudflareAuth,
				},
			],
		},
	]);
	handler();
}
main();
