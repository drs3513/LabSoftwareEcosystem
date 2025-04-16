import {defineBackend} from '@aws-amplify/backend';
import {auth} from './auth/resource.js';
import {data} from './data/resource.js';
import {storage} from './storage/resource.js';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as osis from "aws-cdk-lib/aws-osis";
import * as logs from "aws-cdk-lib/aws-logs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as iam from 'aws-cdk-lib/aws-iam'

const backend = defineBackend({
  auth,
  storage,
  data
});

const { cfnUserPool } = backend.auth.resources.cfnResources;
// modify cfnUserPool policies directly
cfnUserPool.policies = {
  passwordPolicy: {
    minimumLength: 8,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    requireUppercase: true,
    temporaryPasswordValidityDays: 20,
  },
};


//Opensearch Implementation : Ignore this!
/*
//IMPORTANT
//AWS OpenSearch implementation, defined such that the price to the host is as low as possible
const fileTable =
    backend.data.resources.cfnResources.amplifyDynamoDbTables["File"]

fileTable.pointInTimeRecoveryEnabled = true;

fileTable.streamSpecification = {
  streamViewType: dynamodb.StreamViewType.NEW_IMAGE
}


const fileTableArn = backend.data.resources.tables["File"].tableArn;

const fileTableName = backend.data.resources.tables["File"].tableName;

const openSearchDomain = new opensearch.Domain(
    backend.data.stack,
    "OpenSearchDomain",
    {
      version: opensearch.EngineVersion.OPENSEARCH_2_11,
      capacity: {
        masterNodeInstanceType: "t3.small.search", //t2.micro.search is the lowest tier option selectable
          //upgrade to t3.small.search, with 3 masterNodes if performance is not as expected
          //t3.small.search Pricing : ~30$ per month
          //t2.micro.search Pricing : included in free tier
        masterNodes: 0,
        dataNodeInstanceType: "t3.small.search",
        dataNodes: 1
      },
      nodeToNodeEncryption: true,
      removalPolicy: RemovalPolicy.DESTROY,
        //not compatible with t2.micro.search
      encryptionAtRest: {
        enabled: true
      }

    }
)

const openSearchS3BucketARN = backend.openSearchStorage.resources.bucket.bucketArn;

const openSearchS3BucketName = backend.openSearchStorage.resources.bucket.bucketName;

// Create an IAM role for OpenSearch integration
const openSearchIntegrationPipelineRole = new iam.Role(
    backend.data.stack,
    "OpenSearchIntegrationPipelineRole",
    {
        assumedBy: new iam.ServicePrincipal("osis-pipelines.amazonaws.com"),
        inlinePolicies: {
            openSearchPipelinePolicy: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        actions: ["es:DescribeDomain"],
                        resources: [
                            openSearchDomain.domainArn,
                            openSearchDomain.domainArn + "/*",
                        ],
                        effect: iam.Effect.ALLOW,
                    }),
                    new iam.PolicyStatement({
                        actions: ["es:ESHttp*"],
                        resources: [
                            openSearchDomain.domainArn,
                            openSearchDomain.domainArn + "/*",
                        ],
                        effect: iam.Effect.ALLOW,
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "s3:GetObject",
                            "s3:AbortMultipartUpload",
                            "s3:PutObject",
                            "s3:PutObjectAcl",
                        ],
                        resources: [openSearchS3BucketARN, openSearchS3BucketARN + "/*"],
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "dynamodb:DescribeTable",
                            "dynamodb:DescribeContinuousBackups",
                            "dynamodb:ExportTableToPointInTime",
                            "dynamodb:DescribeExport",
                            "dynamodb:DescribeStream",
                            "dynamodb:GetRecords",
                            "dynamodb:GetShardIterator",
                        ],
                        resources: [fileTableArn, fileTableArn + "/*"],
                    }),
                ],
            }),
        },
        managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName(
                "AmazonOpenSearchIngestionFullAccess"
            ),
        ],
    }
);


// Define OpenSearch index mappings
const indexName = "file";

const indexMapping = {
    settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
    },
    mappings: {
        properties: {
            id: {
                type: "keyword"
            },
            fileId: {
                type: "keyword"
            },
            filename: {
                type: "text",
            },
            isDirectory: {
                type: "boolean"
            },
            filepath: {
                type: "text"
            },
            parentId: {
                type: "keyword"
            },
            size: {
                type: "long"
            },
            storageId: {
                type: "keyword"
            },
            versionId: {
                type: "keyword"
            },
            ownerId: {
                type: "keyword"
            },
            projectId: {
                type: "keyword"
            },
            createdAt: {
                type: "date",
                format: "strict_date_time"
            },
            updatedAt: {
                type: "date",
                format: "strict_date_time"
            },

            tags: {
                type: "keyword"
            },
            isDeleted: {
                type: "boolean"
            },
            deletedAt: {
                type: "date",
                format: "strict_date_time"
            }

        }
    }
};
// OpenSearch template definition
const openSearchTemplate = `
version: "2"
dynamodb-pipeline:
  source:
    dynamodb:
      acknowledgments: true
      tables:
        - table_arn: "${fileTableArn}"
          stream:
            start_position: "LATEST"
          export:
            s3_bucket: "${openSearchS3BucketName}"
            s3_region: "${backend.openSearchStorage.stack.region}"
            s3_prefix: "${fileTableName}/"
      aws:
        sts_role_arn: "${openSearchIntegrationPipelineRole.roleArn}"
        region: "${backend.data.stack.region}"
  sink:
    - opensearch:
        hosts:
          - "https://${openSearchDomain.domainEndpoint}"
        index: "${indexName}"
        index_type: "custom"
        template_content: |
          ${JSON.stringify(indexMapping)}
        document_id: '\${getMetadata("primary_key")}'
        action: '\${getMetadata("opensearch_action")}'
        document_version: '\${getMetadata("document_version")}'
        document_version_type: "external"
        bulk_size: 4
        aws:
          sts_role_arn: "${openSearchIntegrationPipelineRole.roleArn}"
          region: "${backend.data.stack.region}"
`;


// Create a CloudWatch log group
const logGroup = new logs.LogGroup(backend.data.stack, "LogGroup", {
    logGroupName: "/aws/vendedlogs/OpenSearchService/pipelines/1",
    removalPolicy: RemovalPolicy.DESTROY,
});


// Create an OpenSearch Integration Service pipeline
const cfnPipeline = new osis.CfnPipeline(
    backend.data.stack,
    "OpenSearchIntegrationPipeline",
    {
        maxUnits: 4,
        minUnits: 1,
        pipelineConfigurationBody: openSearchTemplate,
        pipelineName: "dynamodb-integration-2",
        logPublishingOptions: {
            isLoggingEnabled: true,
            cloudWatchLogDestination: {
                logGroup: logGroup.logGroupName,
            },
        },
    }
);

const osDataSource = backend.data.addOpenSearchDataSource(
    "osDataSource",
    openSearchDomain
)
*/
