# Invoke Inputs

For local testing and invoking of this function, we can invoke the TestEntrypoint function of the 
custom resource provider so that we can circumvent some of the other complexities of the request
payload for the actual handler during testing.

**This is not what cloudformation uses when running `cfn test` and should only be used for storing
good payloads for local testing via invoke**

## Test Event format

The Test Event format has a slightly different format then the whole Cloudformation lambda request.
You can verify this format against the `TestEvent` type definition for your version of the 
`cloudformation-cli-typescript-lib` package.

At the time of writing this, the TestEvent is:

```typescript
export class TestEvent {
    @Expose() credentials: Credentials;
    @Expose() action: Action;
    @Expose() request: Dict;
    @Expose() callbackContext: Dict;
    @Expose() region?: string;
}
```

### Key Differences

#### Credentials

Normally, in the actual call to your lambda function, the `requestData` top-level field provides both:

* Caller Credentials
* Provider Credentials

The Caller Credentials are those credentials that the caller is granting to your custom resource handler
to do additional AWS service based calls on their behalf.

The Provider Credentials are strictly used for provider related base tasks like logging and writing metrics
about the lambda that is running.

For our test runs, in reality, you probably just want to connect both to a test account, so the credentials get
distributed for both provider and caller sessions of the aws-sdk.

## Requests for the actual TypeFunction entrypoint

If you want to store requests for testing the actual TypeFunction entrypoint, you will want to match the `HandlerRequest`
type from your `cloudformation-cli-typescript-lib` package.

TODO: setting up that template and how to test that would be pretty sweet if there's a use case for it.
