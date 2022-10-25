import { S3Client, CreateBucketCommand, PutBucketWebsiteCommand, PutObjectCommand, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const client = new S3Client({ region: 'eu-central-1' });

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
