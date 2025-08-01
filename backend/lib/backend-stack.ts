import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";

import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.createBucket("echopeakdev.yt-to-mp3-converter");
  }

  private createBucket(bucketName: string) {
    new s3.Bucket(this, bucketName, {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.ONE_ZONE_INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.hours(6),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.hours(72),
            },
          ],
        },
      ],
    });
  }
}
