import { S3Client, CreateBucketCommand, PutBucketWebsiteCommand, PutObjectCommand, DeleteBucketCommand, ListObjectsCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

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

function listBucketObjects(name) {
	const command = new ListObjectsCommand({
		Bucket: name,
	});
	return client.send(command);
}

export async function emptyBucket(name) {
	const bucketObjects = await listBucketObjects(name);
	if (!bucketObjects?.Contents) return;

	const Objects = bucketObjects.Contents.map(item => ({ Key: item.Key }));
	const command = new DeleteObjectsCommand({
		Bucket: name,
		Delete: {
			Objects: Objects,
		},
	});
	return client.send(command);
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
