import { SendMessageCommand } from '@aws-sdk/client-sqs'
import { QueueOperationFailed, EncodeRecordFailed } from '@web3-storage/filecoin-api/errors'

import { connectQueue } from './index.js'

/**
 * @template Data
 *
 * @param {import('./types.js').QueueConnect | import('@aws-sdk/client-sqs').SQSClient} conf
 * @param {object} context
 * @param {string} context.queueUrl
 * @param {(item: Data) => Promise<string>} context.encodeMessage
 * @returns {import('@web3-storage/filecoin-api/types').Queue<Data>}
 */
export function createQueueClient (conf, context) {
  const queueClient = connectQueue(conf)
  return {
    add: async (record, options = {}) => {
      /** @type {string} */
      let encodedRecord
      try {
        encodedRecord = await context.encodeMessage(record)
      } catch (/** @type {any} */ error) {
        return {
          error: new EncodeRecordFailed(error.message)
        }
      }

      const cmd = new SendMessageCommand({
        QueueUrl: context.queueUrl,
        MessageBody: encodedRecord,
        MessageGroupId: options.messageGroupId
      })

      let r
      try {
        r = await queueClient.send(cmd)
        if (r.$metadata.httpStatusCode !== 200) {
          throw new Error(`failed sending message to queue with code ${r.$metadata.httpStatusCode}`)
        }
      } catch (/** @type {any} */ error) {
        return {
          error: new QueueOperationFailed(error.message)
        }
      }

      return {
        ok: {}
      }
    }
  }
}
