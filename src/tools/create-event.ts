import { join } from 'path'
import { program } from 'commander'
import { existsSync, readFileSync } from 'fs'
import { parse, stringify } from 'comment-json'
import { HandlerRequest, TestEvent } from '@amazon-web-services-cloudformation/cloudformation-cli-typescript-lib'

/**
 * This script will transform input files to be more configurable.
 * It also usees a json parsing library that support comments so that you 
 * can annotate your examples in place for other developers.
 * 
 * You can use this with sam local invoke by piping:
 * 
 * create-event -e <myfile> --useAwsEnv | sam local invoke -e -
 */

program
    .requiredOption('-e, --event <path>', 'The event file that we will be parameterizing')
    .option('--useAwsEnv', 'Uses the aws environment on the shell in the request in place of caller credentials')

program.parse()

const options = program.opts()

const eventUrl = options.event

if (!existsSync(eventUrl)) {
    console.error(`file does not exist: ${eventUrl}`)
    process.exit(1)
}

const json = parse(readFileSync(eventUrl).toString(), null, true) 
const isTestEvent = !!(json as unknown as TestEvent).credentials

if (options.useAwsEnv) {
    const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN } = process.env

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
        console.error('Must have AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN on environment to useAwsEnv')
        process.exit(1)
    }

    if (isTestEvent) {
        const cast = json as unknown as TestEvent
        cast.credentials = {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
            sessionToken: AWS_SESSION_TOKEN,
        }
    } else {
        const cast = json as unknown as HandlerRequest
        cast.requestData.callerCredentials = {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
            sessionToken: AWS_SESSION_TOKEN,
        }
    }
}

console.log(stringify(json, null, 4))
