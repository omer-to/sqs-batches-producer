import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs'
import type { SendMessageBatchCommandInput, SendMessageBatchRequestEntry, SendMessageBatchCommandOutput } from '@aws-sdk/client-sqs'

import { Batch } from './Batch'

export class SQSBatchesProducer {
      protected readonly maxMessageSizeInBytes = 262144
      protected batches: Batch[] = []
      protected sqsClient = new SQSClient({})

      /**
       * 
       * @param queueUrl The URL of the queue to be used in `SendMessageBatchCommandInput`
       * @param maxNumEntries The maximum entries to be included in a single batch. Must be between 1 and 10, both inclusive. @default 10
       */
      constructor(protected readonly queueUrl: string, protected readonly maxNumEntries = 10) {
            if (maxNumEntries < 1 || maxNumEntries > 10) throw new RangeError('maxNumEntries must be between 1 and 10, both inclusive.')
      }

      /**
       * @description Creates a `SendMessageBatchCommand` from the entries provided.
       * 
       * @param entries The entries to be included in the batch
       */
      protected createBatchCommandFrom(entries: SendMessageBatchRequestEntry[]): SendMessageBatchCommand {
            const commandInput: SendMessageBatchCommandInput = { QueueUrl: this.queueUrl, Entries: entries }
            return new SendMessageBatchCommand(commandInput)
      }

      /**
       * 
       * @param entries The entries to be sent in the command
       */
      protected sendBatchCommand(entries: SendMessageBatchRequestEntry[]): Promise<SendMessageBatchCommandOutput> {
            const command = this.createBatchCommandFrom(entries)
            return this.sqsClient.send(command)
      }

      /**
       * 
       * @param messageBody The Message Body of the entry
       * @returns The total number of bytes in the message body
       */
      protected messageSizeInBytesFrom(messageBody: string) {
            return Buffer.byteLength(messageBody, 'utf-8')
      }

      /**
       * 
       * @param messageSize The size of the message body in bytes
       * @param batch The batch to check against if it has enough space for the message
       * @returns true if the batch as a space for the message, otherwise false
       */
      protected shouldGoIntoCurrentBatch(messageSize: number, batch: Batch): boolean {
            const { totalBytes = 0, totalEntrySize = 0 } = batch
            console.log({
                  totalEntrySize,
                  totalBytes,
                  messageSize
            })
            if (
                  totalEntrySize + 1 <= this.maxNumEntries
                  &&
                  totalBytes + messageSize <= this.maxMessageSizeInBytes
            )
                  return true
            return false
      }

      /**
       * @description Mutates `this.batches` by pushing a new element
       * 
       * @param entry The entry to create a new batch from
       * @param messageSize The size of the message body in bytes
       */
      protected newBatchFrom(entry: SendMessageBatchRequestEntry, messageSize: number) {
            const batch = new Batch([entry], 1, messageSize)
            this.batches.push(batch)
      }

      /**
       * 
       * @param entries 
       * @returns 
       */
      async send(entries: SendMessageBatchRequestEntry[]) {
            for (const entry of entries) {
                  const batchesLen = this.batches.length
                  const messageSize = this.messageSizeInBytesFrom(entry.MessageBody!)

                  /////////////////////////////////////////
                  // * In the first iteration, there is nothing in `this.batches`
                  // * So we directly push into it
                  /////////////////////////////////////////
                  if (!batchesLen) {
                        this.newBatchFrom(entry, messageSize)
                        continue
                  }

                  const currentBatch = this.batches[batchesLen - 1]

                  if (this.shouldGoIntoCurrentBatch(messageSize, currentBatch)) {
                        currentBatch.entries.push(entry)
                        /** Update the totalBytes of the batch by adding the message size */
                        currentBatch.totalBytes = currentBatch.totalBytes + messageSize
                        /** Increment the total entry size by 1 as a new entry is pushed to the batch */
                        currentBatch.totalEntrySize = currentBatch.totalEntrySize + 1
                  } else {
                        /** The batch does not have enough space for the entry, so a new batch is created */
                        this.newBatchFrom(entry, messageSize)
                  }
            }
            console.log('============= BATCHES ===============')
            console.log(JSON.stringify({
                  batches: this.batches,
                  numBatches: this.batches.length
            }, null, 4));
            console.log('============= ======= ===============')
            return await Promise.allSettled(this.batches.map(batch => this.sendBatchCommand(batch.entries)))
      }
}