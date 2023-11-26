# ExampleTest::Test::Resource

This Resource Provider is a full example using the main [template for a typescript custom resource type](https://github.com/hanseltime/yarn-cfn-resource-template).
This resource does 2 things:

1. proxies SSM Parameter creation of type string and tags them with a specific AWS tag for list operations.
2. demonstrates how you would install something like kubectl into your resource type handler (not using layers)

Please note, this is not a production ready resource type but details most edge cases found when trying to do things like:

* Building custom runtime builds
* Testing
* Debugging
* Using Localstack for faster iteration
  * Note - currently, there is a [bug](https://github.com/getmoto/moto/pull/7066) in localstack that actually causes one contract test to fail

# Developing

Please see the [Development Document](./DEVELOPMENT.md) for more information about navigating this as a developer.
