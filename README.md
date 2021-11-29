# SQS Batch Limits
In order to reduce costs, it is recommended to use Batch actions. However, there are limits related to message.
The maximum number of messages that can be sent in a single batch is 10, and the total size of all messages in a single batch cannot exceed 256 KB (262,144 bytes).

# sqs-batches-producer
This package groups messages into batches by considering the limits stated above, and concurrently executes [`SendMessageBatchCommand`(s)](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/classes/sendmessagebatchcommand.html) of AWS SDK for JavaScript v3 client for SQS

# Usage
```typescript
import { SQSBatchesProducer } from 'sqs-batches-producer'

import type { SendMessageBatchRequestEntry, SendMessageBatchCommandOutput } from '@aws-sdk/client-sqs'

async function main() {
    const sqsBatchesProducer = new SQSBatchesProducer('the-queue-url')

    const entries: SendMessageBatchRequestEntry[] = [ { ... }, { ... }, ... ]

    const successful: SendMessageBatchCommandOutput[] = []
    const failed: unknown[] = []

    const outputs = await sqsBatchesProducer.send(entries)

    for (const output of outputs) {
        if (output.status === 'fulfilled') {
            successful.push(output.value)
        } else {
            failed.push(output.reason)
        }
    }
    // Do something with `successful` batches
    // Do something with `failed` batches
}
```
