/*!
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as common from '@google-cloud/common';
import {promisifyAll} from '@google-cloud/promisify';

import type {Compute} from '.';
import type {Region} from './region';
import type {Zone} from './zone';

export type OperationCallback = (
  error: common.ApiError | null,
  operation: Operation | null,
  apiResponse?: common.Metadata
) => void;
export type OperationPromise = Promise<[Operation, common.Metadata]>;
export type CreateResourceCallback<T extends common.ServiceObject> = (
  error: common.ApiError | null,
  resource?: T | null,
  operation?: Operation | null,
  apiResponse?: common.Metadata
) => void;
export type CreateResourcePromise<T extends common.ServiceObject> = Promise<
  [T, Operation, common.Metadata]
>;

/**
 * An Operation object allows you to interact with a Google Compute Engine
 * operation.
 *
 * An operation can be a
 * [GlobalOperation](https://cloud.google.com/compute/docs/reference/v1/globalOperations),
 * [RegionOperation](https://cloud.google.com/compute/docs/reference/v1/regionOperations),
 * or
 * [ZoneOperation](https://cloud.google.com/compute/docs/reference/v1/zoneOperations).
 *
 * @class
 * @param {Compute|Zone|Region} scope The scope of the operation: a `Compute`,
 *     `Zone`, or `Region` object.
 * @param {string} name Operation name.
 *
 * @example
 * const Compute = require('@google-cloud/compute');
 * const compute = new Compute();
 *
 * //-
 * // Reference a global operation.
 * //-
 * const operation = compute.operation('operation-id');
 *
 * //-
 * // Reference a region operation.
 * //-
 * const region = compute.region('us-central1');
 * const operation = region.operation('operation-id');
 *
 * //-
 * // Reference a zone operation.
 * //-
 * const zone = compute.zone('us-central1-a');
 * const operation = zone.operation('operation-id');
 *
 * //-
 * // All operations are event emitters. The status of each operation is polled
 * // continuously, starting only after you register a "complete" listener.
 * //-
 * operation.on('complete', function(metadata) {
 *   // The operation is complete.
 * });
 *
 * //-
 * // You can register a listener to monitor when the operation begins running.
 * //-
 * operation.on('running', function(metadata) {
 *   // The operation is running.
 * });
 *
 * //-
 * // Be sure to register an error handler as well to catch any issues which
 * // impeded the operation.
 * //-
 * operation.on('error', function(err) {
 *   // An error occurred during the operation.
 * });
 *
 * //-
 * // To force the Operation object to stop polling for updates, simply remove
 * // any "complete" listeners you've registered.
 * //
 * // The easiest way to do this is with `removeAllListeners()`.
 * //-
 * operation.removeAllListeners();
 */
export class Operation extends common.Operation {
  name: string;
  status?: string;
  constructor(scope: Compute | Zone | Region, name: string) {
    const isCompute = scope.constructor.name === 'Compute';
    const methods = {
      /**
       * Delete the operation.
       *
       * @see [GlobalOperations: delete API Documentation]{@link https://cloud.google.com/compute/docs/reference/v1/globalOperations/delete}
       * @see [RegionOperations: delete API Documentation]{@link https://cloud.google.com/compute/docs/reference/v1/regionOperations/delete}
       * @see [ZoneOperations: delete API Documentation]{@link https://cloud.google.com/compute/docs/reference/v1/zoneOperations/delete}
       *
       * @method Operation#delete
       * @param {function=} callback - The callback function.
       * @param {?error} callback.err - An error returned while making this
       *     request.
       * @param {object} callback.apiResponse - The full API response.
       *
       * @example
       * const Compute = require('@google-cloud/compute');
       * const compute = new Compute();
       * const operation = compute.operation('operation-id');
       *
       * operation.delete(function(err, apiResponse) {});
       *
       * //-
       * // If the callback is omitted, we'll return a Promise.
       * //-
       * operation.delete().then(function(data) {
       *   var apiResponse = data[0];
       * });
       */
      delete: true,
      /**
       * Check if the operation exists.
       *
       * @method Operation#exists
       * @param {function} callback - The callback function.
       * @param {?error} callback.err - An error returned while making this
       *     request.
       * @param {boolean} callback.exists - Whether the operation exists or not.
       *
       * @example
       * const Compute = require('@google-cloud/compute');
       * const compute = new Compute();
       * const operation = compute.operation('operation-id');
       *
       * operation.exists(function(err, exists) {});
       *
       * //-
       * // If the callback is omitted, we'll return a Promise.
       * //-
       * operation.exists().then(function(data) {
       *   var exists = data[0];
       * });
       */
      exists: true,
      /**
       * Get an operation if it exists.
       *
       * @method Operation#get
       * @example
       * const Compute = require('@google-cloud/compute');
       * const compute = new Compute();
       * const operation = compute.operation('operation-id');
       *
       * operation.get(function(err, operation, apiResponse) {
       *   // `operation` is an Operation object.
       * });
       *
       * //-
       * // If the callback is omitted, we'll return a Promise.
       * //-
       * operation.get().then(function(data) {
       *   var operation = data[0];
       *   var apiResponse = data[1];
       * });
       */
      get: true,
    };
    super({
      parent: scope,
      baseUrl: isCompute ? '/global/operations' : '/operations',
      /**
       * @name Operation#id
       * @type {string}
       */
      id: name,
      methods: methods,
      pollIntervalMs: isCompute
        ? scope.pollIntervalMs
        : (scope as Zone | Region).compute.pollIntervalMs,
    });

    /**
     * @name Operation#name
     * @type {string}
     */
    this.name = name;
  }
  getMetadata(): Promise<common.Metadata>;
  getMetadata(callback: common.MetadataCallback): void;
  /**
   * Get the operation's metadata. For a detailed description of metadata see
   * [Operation resource](https://goo.gl/sWm1rt).
   *
   * @see [GlobalOperations: get API Documentation]{@link https://cloud.google.com/compute/docs/reference/v1/globalOperations/get}
   * @see [RegionOperations: get API Documentation]{@link https://cloud.google.com/compute/docs/reference/v1/regionOperations/get}
   * @see [ZoneOperations: get API Documentation]{@link https://cloud.google.com/compute/docs/reference/v1/zoneOperations/get}
   *
   * @param {function=} callback - The callback function.
   * @param {?error} callback.err - An error returned while making this request
   * @param {object} callback.metadata - The disk's metadata.
   * @param {object} callback.apiResponse - The full API response.
   *
   * @example
   * const Compute = require('@google-cloud/compute');
   * const compute = new Compute();
   *
   * operation.getMetadata(function(err, metadata, apiResponse) {
   *   // `metadata.error`: Contains errors if the operation failed.
   *   // `metadata.warnings`: Contains warnings.
   * });
   *
   * //-
   * // If the callback is omitted, we'll return a Promise.
   * //-
   * operation.getMetadata().then(function(data) {
   *   const metadata = data[0];
   *   const apiResponse = data[1];
   * });
   */
  getMetadata(
    callback?: common.MetadataCallback
  ): void | Promise<common.Metadata> {
    callback = callback || common.util.noop;
    super.getMetadata(
      (err: common.ApiError | null, apiResponse?: common.Metadata | null) => {
        // An Operation entity contains a property named `error`. This makes
        // `request` think the operation failed, and will return an ApiError to
        // this callback. We have to make sure this isn't a false error by seeing if
        // the response body contains a property that wouldn't exist on a failed API
        // request (`name`).
        const requestFailed =
          err && (!apiResponse || apiResponse.name !== this.name);
        if (requestFailed) {
          callback!(err, null, apiResponse);
          return;
        }
        this.metadata = apiResponse;
        callback!(null, this.metadata, apiResponse);
      }
    );
  }
  /**
   * Poll `getMetadata` to check the operation's status. This runs a loop to ping
   * the API on an interval.
   *
   * Note: This method is automatically called once a "complete" event handler is
   * registered on the operation.
   *
   * @private
   */
  poll_(callback: common.MetadataCallback): void {
    this.getMetadata(
      (
        err?: common.ApiError | null,
        metadata?: common.Metadata | null,
        apiResponse?: common.Metadata | null
      ) => {
        // Parsing the response body will automatically create an ApiError object if
        // the operation failed.
        const parsedHttpRespBody = common.util.parseHttpRespBody(apiResponse);
        err = err || parsedHttpRespBody.err;
        if (err) {
          callback(err);
          return;
        }
        if (metadata.status === 'RUNNING' && !this.status) {
          this.status = metadata.status;
          this.emit('running', metadata);
        }
        if (metadata.status !== 'DONE') {
          callback(null);
          return;
        }
        this.status = metadata.status;
        callback(null, metadata);
      }
    );
  }
}

/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisifyAll(Operation);