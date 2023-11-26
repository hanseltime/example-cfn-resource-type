# Example Cloudformation

If you have submitted this resource privately via `cfn submit` then you can try to deploy one of these
cloudformation stacks that uses the same resource to prove that it works.

This is an important test for you to perform to make sure that runtime permissions, etc. work in actual
context.

```shell
aws cloudformation deploy --stack-name test-stack --template-file example_cfn/example.yaml
```

# How to test using this

If you are deploying this resource stack, you should make sure to perform the following tests in your environment for validation:

1. Create the stack
2. Alter the underlying resources created and run drift detection
3. Delete the stack and verify all resources were removed

If you have a configurable extension, you will want to set up the configuration of the extension as necessary.