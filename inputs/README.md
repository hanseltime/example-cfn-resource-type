# Example Inputs

For contract testing that cloudformation does before greenlighting the resource provider, you need to provide
a set of inputs that match the expected "yaml parameters" of your resource.

It is basically a requirement that you do that here to ensure that tests don't fail sporadically with
auto-generated test results that may clash with naming conventions, etc.

Please see [Resource Type Test](https://docs.aws.amazon.com/cloudformation-cli/latest/userguide/resource-type-test.html), 
specifically the the Specifying input data using input files section.  (Avoid override files for their overly simple
solution).
