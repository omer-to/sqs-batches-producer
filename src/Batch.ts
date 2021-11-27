import type { SendMessageBatchRequestEntry } from '@aws-sdk/client-sqs'

export class Batch {
      /**
       * 
       * @param entries Array of SendMessageBatchRequestEntry that will be sent in the batch
       * @param totalEntrySize The number of entries
       * @param totalBytes The number of total bytes of `MessageBody` of each elements in `entries`
       */
      constructor(
            public entries: SendMessageBatchRequestEntry[],
            public totalEntrySize: number,
            public totalBytes: number
      ) { }

}