#!/usr/bin/env node
import fs from 'fs/promises';
import { createBucket, createBucketWebsiteHosting, addFileToBucket, deleteBucket } from './s3.js';
import mime from 'mime';
import fastGlob from 'fast-glob';

const AWS_REGION = 'eu-central-1';
const DIR = process.cwd().slice(process.cwd().lastIndexOf('/') + 1);
const BUCKET_DOMAIN = `${DIR}.s3-website.${AWS_REGION}.amazonaws.com`;

await deleteBucket({ name: DIR, force: true });
// await setup();
// await deploy();

async function setup() {
	try {
		await createBucket(DIR);
		await createBucketWebsiteHosting(DIR);

		// TODO: setup domain on cloudflare
	} catch (err) {
		console.log(err.message);
	}
}

async function deploy() {
	try {
		const files = await fastGlob('**', { absolute: false });
		const filesData = await Promise.all(files.map(path => fs.readFile(path)));
		const promises = files.map(async (filePath, i) => {
			const fileData = filesData[i];
			await addFileToBucket({
				bucketName: DIR,
				fileName: filePath,
				fileData,
				contentType: mime.getType(filePath),
			});
			console.log(`added ${filePath}`);
		});
		await Promise.all(promises);
		console.log(`BUCKET DOMAIN: http://${BUCKET_DOMAIN}`);
	} catch (err) {
		console.log(err.message);
	}
}

function removeHtmlExtension() {}
