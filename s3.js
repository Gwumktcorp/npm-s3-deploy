import { S3Client, CreateBucketCommand, PutBucketWebsiteCommand, PutObjectCommand, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import path from 'path';
import { HOME_DIR } from './utils.js';

let client = new S3Client({
	region: 'eu-central-1',
	credentials: {
		accessKeyId: 'xxx',
		secretAccessKey: 'xxx',
	},
});

export async function setupClient() {
	const keys = await getAWSKeysFile();
	client = new S3Client({
		region: 'eu-central-1',
		credentials: keys,
	});
}

export function createBucket(name) {
	const command = new CreateBucketCommand({
		Bucket: name,
	});

	return client.send(command);
}

export function createBucketWebsiteHosting(name) {
	const command = new PutBucketWebsiteCommand({
		Bucket: name,
		WebsiteConfiguration: {
			IndexDocument: {
				Suffix: 'index.html',
			},
		},
	});
	return client.send(command);
}

export function addFileToBucket({ bucketName, fileName, fileData, contentType }) {
	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: fileName,
		Body: fileData,
		ContentType: contentType,
		ACL: 'public-read',
	});
	return client.send(command);
}

function listBucketObjects(name, token) {
	const command = new ListObjectsV2Command({
		Bucket: name,
		ContinuationToken: token,
	});
	return client.send(command);
}

async function listAllBucketObjectsInChunks(name, items = [], token) {
	const response = await listBucketObjects(name, token);
	let objects = [...items];
	if (response?.Contents?.length) {
		objects.push(response.Contents);
	}
	if (response.NextContinuationToken) {
		return listAllBucketObjectsInChunks(name, objects, response.NextContinuationToken);
	}

	return objects;
}

export async function emptyBucket(name) {
	const bucketObjectsChunks = await listAllBucketObjectsInChunks(name);

	const promises = [];
	for (let i = 0; i < bucketObjectsChunks.length; i++) {
		const bucketObjects = bucketObjectsChunks[i];

		const command = new DeleteObjectsCommand({
			Bucket: name,
			Delete: {
				Objects: bucketObjects.map(item => ({ Key: item.Key })),
			},
		});
		promises.push(client.send(command));
	}

	return Promise.all(promises);
}

export async function deleteBucket({ name, force = false }) {
	if (force) {
		await emptyBucket(name);
	}
	const command = new DeleteBucketCommand({
		Bucket: name,
	});
	return client.send(command);
}

export async function getAWSKeysFile() {
	const file = await fs.readFile(path.join(HOME_DIR, '.aws/keys.json')).catch(() => {});
	return file ? JSON.parse(file) : {};
}

export async function saveAWSKeysFile(data) {
	await fs.writeFile(path.join(HOME_DIR, '.aws/keys.json'), JSON.stringify(data));
}
