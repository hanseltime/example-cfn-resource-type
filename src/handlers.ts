import {
  Action,
  BaseResource,
  exceptions,
  handlerEvent,
  LoggerProxy,
  OperationStatus,
  Optional,
  ProgressEvent,
  ResourceHandlerRequest,
  SessionProxy,
} from '@amazon-web-services-cloudformation/cloudformation-cli-typescript-lib'
import { ResourceModel, TypeConfigurationModel } from './models'
import { SSM, config } from 'aws-sdk'
import { spawnSync } from 'child_process'
import { resolve } from 'path'
import { GetParameterResult } from 'aws-sdk/clients/ssm'

// Script for creating a local stack endpoint configuration
if (process.env.LOCALSTACK_URL) {
  console.log(`Connecting to localstack ${process.env.LOCALSTACK_URL}`)
  const castConfig = config as any
  castConfig.endpoint = process.env.LOCALSTACK_URL
  config.sslEnabled = false
}

const LAMBDA_BIN_PATH = resolve(__dirname, '..', 'lambda-bin')

type CallbackContext = Record<string, any>

const SSM_PREFIX = 'test-example::'
const CF_TAG = 'TestExampleResource'

class Resource extends BaseResource<ResourceModel> {
  /**
   * CloudFormation invokes this handler when the resource is initially created
   * during stack create operations.
   *
   * See rules: https://docs.aws.amazon.com/cloudformation-cli/latest/userguide/resource-type-test-contract.html#resource-type-test-contract-create
   *
   * @param session Current AWS session passed through from caller
   * @param request The request object for the provisioning request passed to the implementor
   * @param callbackContext Custom context object to allow the passing through of additional
   * state or metadata between subsequent retries
   * @param typeConfiguration Configuration data for this resource type, in the given account
   * and region
   * @param logger Logger to proxy requests to default publishers
   */
  @handlerEvent(Action.Create)
  public async create(
    session: Optional<SessionProxy>,
    request: ResourceHandlerRequest<ResourceModel>,
    callbackContext: CallbackContext,
    logger: LoggerProxy,
    typeConfiguration: TypeConfigurationModel,
  ): Promise<ProgressEvent<ResourceModel, CallbackContext>> {
    console.log(JSON.stringify(request))
    const model = new ResourceModel(request.desiredResourceState)
    const progress = ProgressEvent.progress<ProgressEvent<ResourceModel, CallbackContext>>(model)
    const out = spawnSync(`${LAMBDA_BIN_PATH}/kubectl`, ['--help'], {
      stdio: 'pipe',
    })

    console.log(out.stdout)
    // Example:
    try {
      if (session instanceof SessionProxy) {
        const client = session.client<SSM>('SSM')
        await new Promise<void>((res, rej) => {
          client.putParameter(
            {
              Name: model.name,
              Value: model.value_,
              Type: 'String',
              Tags: [
                {
                  Key: CF_TAG,
                  Value: 'true',
                },
              ],
            },
            (err, data) => {
              if (err) {
                rej(err)
              } else {
                res()
              }
            },
          )
        })
      }
      // Setting the sSMId
      model.id = `${SSM_PREFIX}${model.name}`
      // Setting Status to success will signal to CloudFormation that the operation is complete
      progress.status = OperationStatus.Success
    } catch (err) {
      logger.log(err)
      // exceptions module lets CloudFormation know the type of failure that occurred
      throw new exceptions.InternalFailure(err.message)
      // this can also be done by returning a failed progress event
      // return ProgressEvent.failed(HandlerErrorCode.InternalFailure, err.message);
    }
    return progress
  }

  /**
   * CloudFormation invokes this handler when the resource is updated
   * as part of a stack update operation.
   *
   * See rules: https://docs.aws.amazon.com/cloudformation-cli/latest/userguide/resource-type-test-contract.html#resource-type-test-contract-update
   *
   * @param session Current AWS session passed through from caller
   * @param request The request object for the provisioning request passed to the implementor
   * @param callbackContext Custom context object to allow the passing through of additional
   * state or metadata between subsequent retries
   * @param typeConfiguration Configuration data for this resource type, in the given account
   * and region
   * @param logger Logger to proxy requests to default publishers
   */
  @handlerEvent(Action.Update)
  public async update(
    session: Optional<SessionProxy>,
    request: ResourceHandlerRequest<ResourceModel>,
    callbackContext: CallbackContext,
    logger: LoggerProxy,
    typeConfiguration: TypeConfigurationModel,
  ): Promise<ProgressEvent<ResourceModel, CallbackContext>> {
    console.log(JSON.stringify(request))
    const model = new ResourceModel(request.desiredResourceState)

    const previousModel = new ResourceModel(request.previousResourceState)
    if (previousModel.name !== model.name) {
      throw new exceptions.NotUpdatable('Cannot change the SSM parameter name')
    }

    const progress = ProgressEvent.progress<ProgressEvent<ResourceModel, CallbackContext>>(model)

    try {
      // Get the ssm parameter name
      const ssmName = model.id.replace(SSM_PREFIX, '')
      if (session instanceof SessionProxy) {
        const client = session.client<SSM>('SSM')
        // Verify the parameter exists
        const paramResult = await new Promise<GetParameterResult>((res, rej) => {
          client.getParameter(
            {
              Name: ssmName,
            },
            (err, data) => {
              if (err) {
                rej(err)
              } else {
                res(data)
              }
            },
          )
        })
        // TODO: you would actually probably want to test the tag to make sure it wasn't a different parameter
        await new Promise<void>((res, rej) => {
          client.putParameter(
            {
              Name: ssmName,
              Value: model.value_,
              Type: 'String',
              Overwrite: true,
            },
            (err, data) => {
              if (err) {
                rej(err)
              } else {
                res()
              }
            },
          )
        })
      }
      // Update the progress
      progress.status = OperationStatus.Success
    } catch (err) {
      if (err.code === 'ParameterNotFound') {
        throw new exceptions.NotFound(model.getTypeName(), model.id ?? 'unavailable')
      }
      // exceptions module lets CloudFormation know the type of failure that occurred
      throw new exceptions.InternalFailure(err.message)
      // this can also be done by returning a failed progress event
      // return ProgressEvent.failed(HandlerErrorCode.InternalFailure, err.message);
    }

    return progress
  }

  /**
   * CloudFormation invokes this handler when the resource is deleted, either when
   * the resource is deleted from the stack as part of a stack update operation,
   * or the stack itself is deleted.
   *
   * See rules: https://docs.aws.amazon.com/cloudformation-cli/latest/userguide/resource-type-test-contract.html#resource-type-test-contract-delete
   *
   * @param session Current AWS session passed through from caller
   * @param request The request object for the provisioning request passed to the implementor
   * @param callbackContext Custom context object to allow the passing through of additional
   * state or metadata between subsequent retries
   * @param typeConfiguration Configuration data for this resource type, in the given account
   * and region
   * @param logger Logger to proxy requests to default publishers
   */
  @handlerEvent(Action.Delete)
  public async delete(
    session: Optional<SessionProxy>,
    request: ResourceHandlerRequest<ResourceModel>,
    callbackContext: CallbackContext,
    logger: LoggerProxy,
    typeConfiguration: TypeConfigurationModel,
  ): Promise<ProgressEvent<ResourceModel, CallbackContext>> {
    console.log(JSON.stringify(request))
    const model = new ResourceModel(request.desiredResourceState)
    const progress = ProgressEvent.progress<ProgressEvent<ResourceModel, CallbackContext>>()
    try {
      // Get the ssm parameter name
      const ssmName = model.id.replace(SSM_PREFIX, '')
      if (session instanceof SessionProxy) {
        const client = session.client<SSM>('SSM')
        await new Promise<void>((res, rej) => {
          client.deleteParameter(
            {
              Name: ssmName,
            },
            (err, data) => {
              if (err) {
                rej(err)
              } else {
                res()
              }
            },
          )
        })
      }
      progress.status = OperationStatus.Success
    } catch (err) {
      if (err.code === 'ParameterNotFound') {
        throw new exceptions.NotFound(model.getTypeName(), model.id ?? 'unavailable')
      }
      // exceptions module lets CloudFormation know the type of failure that occurred
      throw new exceptions.InternalFailure(err.message)
      // this can also be done by returning a failed progress event
      // return ProgressEvent.failed(HandlerErrorCode.InternalFailure, err.message);
    }

    return progress
  }

  /**
   * CloudFormation invokes this handler as part of a stack update operation when
   * detailed information about the resource's current state is required.
   *
   * See rules: https://docs.aws.amazon.com/cloudformation-cli/latest/userguide/resource-type-test-contract.html#resource-type-test-contract-read
   *
   * @param session Current AWS session passed through from caller
   * @param request The request object for the provisioning request passed to the implementor
   * @param callbackContext Custom context object to allow the passing through of additional
   * state or metadata between subsequent retries
   * @param typeConfiguration Configuration data for this resource type, in the given account
   * and region
   * @param logger Logger to proxy requests to default publishers
   */
  @handlerEvent(Action.Read)
  public async read(
    session: Optional<SessionProxy>,
    request: ResourceHandlerRequest<ResourceModel>,
    callbackContext: CallbackContext,
    logger: LoggerProxy,
    typeConfiguration: TypeConfigurationModel,
  ): Promise<ProgressEvent<ResourceModel, CallbackContext>> {
    const model = new ResourceModel(request.desiredResourceState)
    try {
      // Get the ssm parameter name
      const ssmName = model.id.replace(SSM_PREFIX, '')
      if (session instanceof SessionProxy) {
        const client = session.client<SSM>('SSM')
        const paramResult = await new Promise<SSM.GetParameterResult>((res, rej) => {
          client.getParameter(
            {
              Name: ssmName,
            },
            (err, data) => {
              if (err) {
                rej(err)
              } else {
                res(data)
              }
            },
          )
        })
        model.value_ = paramResult.Parameter.Value
        model.name = paramResult.Parameter.Name
      }
    } catch (err) {
      if (err.code === 'ParameterNotFound') {
        throw new exceptions.NotFound(model.getTypeName(), model.id ?? 'unavailable')
      }
      // exceptions module lets CloudFormation know the type of failure that occurred
      throw new exceptions.InternalFailure(err.message)
      // this can also be done by returning a failed progress event
      // return ProgressEvent.failed(HandlerErrorCode.InternalFailure, err.message);
    }
    const progress = ProgressEvent.success<ProgressEvent<ResourceModel, CallbackContext>>(model)
    return progress
  }

  /**
   * CloudFormation invokes this handler when summary information about multiple
   * resources of this resource provider is required.
   *
   * See rules: https://docs.aws.amazon.com/cloudformation-cli/latest/userguide/resource-type-test-contract.html#resource-type-test-contract-list
   *
   * @param session Current AWS session passed through from caller
   * @param request The request object for the provisioning request passed to the implementor
   * @param callbackContext Custom context object to allow the passing through of additional
   * state or metadata between subsequent retries
   * @param typeConfiguration Configuration data for this resource type, in the given account
   * and region
   * @param logger Logger to proxy requests to default publishers
   */
  @handlerEvent(Action.List)
  public async list(
    session: Optional<SessionProxy>,
    request: ResourceHandlerRequest<ResourceModel>,
    callbackContext: CallbackContext,
    logger: LoggerProxy,
    typeConfiguration: TypeConfigurationModel,
  ): Promise<ProgressEvent<ResourceModel, CallbackContext>> {
    const client = session.client<SSM>('SSM')
    try {
      const paramResult = await new Promise<SSM.DescribeParametersResult>((res, rej) => {
        client.describeParameters(
          {
            /**
             * Filters to limit the request results.
             */
            ParameterFilters: [
              {
                Key: `tag:${CF_TAG}`,
                Values: ['true'],
                Option: 'Equals',
              },
            ],
            /**
             * The maximum number of items to return for this call. The call also returns a token that you can specify in a subsequent call to get the next set of results.
             */
            MaxResults: 10,
            /**
             * The token for the next set of items to return. (You received this token from a previous call.)
             */
            NextToken: request.nextToken,
          },
          (err, data) => {
            if (err) {
              rej(err)
            } else {
              res(data)
            }
          },
        )
      })
      console.log(JSON.stringify(paramResult))
      const models: ResourceModel[] = await Promise.all(
        paramResult.Parameters?.map(async (param) => {
          const details = await new Promise<GetParameterResult>((res, rej) => {
            client.getParameter(
              {
                Name: param.Name,
              },
              (err, data) => {
                if (err) {
                  rej(err)
                } else {
                  res(data)
                }
              },
            )
          })
          return new ResourceModel({
            id: makeId(details.Parameter.Name),
            name: details.Parameter.Name,
            value_: details.Parameter.Value,
          })
        }),
      )
      const progress = ProgressEvent.builder<ProgressEvent<ResourceModel, CallbackContext>>()
        .status(OperationStatus.Success)
        .resourceModels(models)
        .nextToken(paramResult.NextToken)
        .build()
      return progress
    } catch (err) {
      throw new exceptions.InternalFailure(err.message)
    }
  }
}

function makeId(name: string) {
  return `${SSM_PREFIX}${name}`
}

// if running against v1.0.1 or earlier of plugin the 5th argument is not known but best to ignored (runtime code may warn)
export const resource = new Resource(ResourceModel.TYPE_NAME, ResourceModel, null, null, TypeConfigurationModel)!

// Entrypoint for production usage after registered in CloudFormation
export const entrypoint = resource.entrypoint

// Entrypoint used for local testing
export const testEntrypoint = resource.testEntrypoint
