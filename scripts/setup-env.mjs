import fs from 'fs';
import os from 'os';
import path from 'path';

const outputsPath = './amplify/outputs/amplify_outputs.json';
const isCI = process.env.CI || process.env.NODE_ENV === 'production';
const envFile = isCI ? '.env' : '.env.local';
const envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(outputsPath)) {
  console.warn('amplify_outputs.json not found. Skipping env injection.');
  process.exit(0);
}

const outputs = JSON.parse(fs.readFileSync(outputsPath, 'utf-8'));
const bucketName = outputs?.storage?.filestorage142024?.bucketName;
const region = outputs?.storage?.filestorage142024?.region ?? 'us-east-1';

if (!bucketName) {
  console.error('Could not find bucketName in amplify outputs.');
  process.exit(1);
}

// Load existing env content
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

// Remove old definitions if they exist
envContent = envContent
  .split('\n')
  .filter(line => !line.startsWith('NEXT_PUBLIC_S3_BUCKET_NAME=') && !line.startsWith('NEXT_PUBLIC_AWS_REGION='))
  .join('\n')
  .trim();

// Add new definitions
envContent += `${os.EOL}NEXT_PUBLIC_S3_BUCKET_NAME=${bucketName}`;
envContent += `${os.EOL}NEXT_PUBLIC_AWS_REGION=${region}${os.EOL}`;

fs.writeFileSync(envPath, envContent);
