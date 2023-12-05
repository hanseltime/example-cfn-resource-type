# Invoke Inputs

For local testing and invoking of this function, we can invoke the TestEntrypoint or the TypeFunction
after having run `yarn sam-build-docker` or its debug variant.

The inputs in this folder represent the 2 different types of inputs that each entrypoint takes.

## Event Creation Script

There is already a section in [Development.md](../DEVELOPMENT.md) on this, but it is worth reiterating that all of these json files should be used with the `yarn create-event` script.

This script allows us to keep comments in the json and to parameterize things like credentials.

## Requests for the actual TypeFunction entrypoint

If you want to store requests for testing the actual TypeFunction entrypoint, you will want to match the `HandlerRequest`
type from your `cloudformation-cli-typescript-lib` package.

All json files that are not postfixed with `_test` have the anticipated format for a raw handler request as of the time
of writing this. You can come through the requests to get an understanding of the values that you can provide.

Note, the raw payload does not exactly match the typescript named fields for the request by the time that they
make it to your handler. This could be cause for confusion. If you want a simplified payload, you can
use the TestEntrypoint instead.

## Using Test Entrypoint

The TestEntrypoint function of the custom resource provider so that we can circumvent some of
the other complexities of the request payload for the actual handler during testing.

** All files of the test event format are current denotes with `_test.json`.**

### Test Event format

The Test Event format has a slightly different format then the whole Cloudformation lambda request.
You can verify this format against the `TestEvent` type definition for your version of the
`cloudformation-cli-typescript-lib` package.

At the time of writing this, the TestEvent is:

```typescript
export class TestEvent {
  @Expose() credentials: Credentials
  @Expose() action: Action
  @Expose() request: Dict
  @Expose() callbackContext: Dict
  @Expose() region?: string
}
```

### Key Differences Between TypeFunction

#### Credentials

Normally, in the actual call to your lambda function, the `requestData` top-level field provides both:

- Caller Credentials
- Provider Credentials

The Caller Credentials are those credentials that the caller is granting to your custom resource handler
to do additional AWS service based calls on their behalf.

The Provider Credentials are strictly used for provider related base tasks like logging and writing metrics
about the lambda that is running.

For our test runs, in reality, you probably just want to connect both to a test account, so the credentials get
distributed for both provider and caller sessions of the aws-sdk.
