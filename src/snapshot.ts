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

import {ServiceObject, util} from '@google-cloud/common';
import type {Metadata, ServiceObjectConfig} from '@google-cloud/common';
import {promisifyAll} from '@google-cloud/promisify';

import type {Compute} from '.';
import type {OperationCallback} from './operation';
import type {Disk} from './disk';

/**
 * A Snapshot object allows you to interact with a Google Compute Engine
 * snapshot.
 *
 * @see [Snapshots Overview]{@link https://cloud.google.com/compute/docs/disks/persistent-disks#snapshots}
 * @see [Snapshot Resource]{@link https://cloud.google.com/compute/docs/reference/v1/snapshots}
 *
 * @class
 * @param {Compute|Disk} scope - The parent scope this
 *     snapshot belongs to. If it's a Disk, we expose the `create` methods.
 * @param {string} name - Snapshot name.
 *
 * @example
 * const Compute = require('@google-cloud/compute');
 * const compute = new Compute();
 * const snapshot = compute.snapshot('snapshot-name');
 *
 * //-
 * // Or, access through a disk.
 * //-
 * const disk = compute.zone('us-central1-a').disk('disk-name');
 * const snapshot = disk.snapshot('disk-snapshot-name');
 */
export class Snapshot extends ServiceObject {
  compute: Compute;
  name: string;
  constructor(scope: Compute | Disk, name: string) {
    const isDisk = scope.constructor.name === 'Disk';
    const methods = {
      /**
       * Check if the snapshot exists.
       *
       * @method Snapshot#exists
       * @param {function} callback - The callback function.
       * @param {?error} callback.err - An error returned while making this
       *     request.
       * @param {boolean} callback.exists - Whether the snapshot exists or not.
       *
       * @example
       * const Compute = require('@google-cloud/compute');
       * const compute = new Compute();
       * const snapshot = compute.snapshot('snapshot-name');
       *
       * snapshot.exists(function(err, exists) {});
       */
      exists: true,
      /**
       * Get a snapshot if it exists.
       *
       * If you access this snapshot through a Disk object, this can be used as a
       * "get or create" method. Pass an object with `autoCreate` set to `true`.
       * Any extra configuration that is normally required for the `create` method
       * must be contained within this object as well.
       *
       * @method Snapshot#get
       * @param {options=} options - Configuration object.
       * @param {boolean} options.autoCreate - Automatically create the object if
       *     it does not exist. Default: `false`
       *
       * @example
       * const Compute = require('@google-cloud/compute');
       * const compute = new Compute();
       * const snapshot = compute.snapshot('snapshot-name');
       *
       * snapshot.get(function(err, snapshot, apiResponse) {
       *   // `snapshot` is a Snapshot object.
       * });
       *
       * //-
       * // If the callback is omitted, we'll return a Promise.
       * //-
       * snapshot.get().then(function(data) {
       *   const snapshot = data[0];
       *   const apiResponse = data[1];
       * });
       */
      get: true,
      /**
       * Get the snapshot's metadata.
       *
       * @see [Snapshot Resource]{@link https://cloud.google.com/compute/docs/reference/v1/snapshots}
       * @see [Snapshots: get API Documentation]{@link https://cloud.google.com/compute/docs/reference/v1/snapshots/get}
       *
       * @method Snapshot#getMetadata
       * @param {function=} callback - The callback function.
       * @param {?error} callback.err - An error returned while making this
       *     request.
       * @param {object} callback.metadata - The snapshot's metadata.
       * @param {object} callback.apiResponse - The full API response.
       *
       * @example
       * const Compute = require('@google-cloud/compute');
       * const compute = new Compute();
       * const snapshot = compute.snapshot('snapshot-name');
       *
       * snapshot.getMetadata(function(err, metadata, apiResponse) {});
       *
       * //-
       * // If the callback is omitted, we'll return a Promise.
       * //-
       * snapshot.getMetadata().then(function(data) {
       *   const metadata = data[0];
       *   const apiResponse = data[1];
       * });
       */
      getMetadata: true,
    };
    const compute = isDisk ? (scope as Disk).zone.compute : (scope as Compute);
    const config: ServiceObjectConfig = {
      parent: scope,
      baseUrl: `https://${compute.apiEndpoint}/compute/v1/projects/{{projectId}}/global/snapshots`,
      /**
       * @name Snapshot#id
       * @type {string}
       */
      id: name,
      methods: methods,
      pollIntervalMs: compute.pollIntervalMs,
    };
    if (isDisk) {
      config.createMethod = (scope as Disk).createSnapshot.bind(scope);
      /**
       * Create a snapshot.
       *
       * **This is only available if you accessed this object through
       * {@link Disk#snapshot}.**
       *
       * @method Snapshot#create
       * @param {object} config - See {@link Disk#createSnapshot}.
       *
       * @example
       * const Compute = require('@google-cloud/compute');
       * const compute = new Compute();
       * const snapshot = compute.snapshot('snapshot-name');
       *
       * snapshot.create(function(err, snapshot, operation, apiResponse) {
       *   // `snapshot` is a Snapshot object.
       *
       *   // `operation` is an Operation object that can be used to check the
       *   // status of the request.
       * });
       *
       * //-
       * // If the callback is omitted, we'll return a Promise.
       * //-
       * snapshot.create().then(function(data) {
       *   const snapshot = data[0];
       *   const operation = data[1];
       *   const apiResponse = data[2];
       * });
       */
      config.methods!.create = true;
    }
    super(config);
    /**
     * @name Snapshot#compute
     * @type {Compute}
     */
    this.compute = compute;
    /**
     * @name Snapshot#name
     * @type {string}
     */
    this.name = name;
  }
  delete(): Promise<[Metadata]>;
  delete(callback: OperationCallback): void;
  /**
   * Delete the snapshot.
   *
   * @see [Snapshots: delete API Documentation]{@link https://cloud.google.com/compute/docs/reference/v1/snapshots/delete}
   *
   * @param {function=} callback - The callback function.
   * @param {?error} callback.err - An error returned while making this request.
   * @param {Operation} callback.operation - An operation object
   *     that can be used to check the status of the request.
   * @param {object} callback.apiResponse - The full API response.
   *
   * @example
   * const Compute = require('@google-cloud/compute');
   * const compute = new Compute();
   * const snapshot = compute.snapshot('snapshot-name');
   *
   * snapshot.delete(function(err, operation, apiResponse) {
   *   // `operation` is an Operation object that can be used to check the status
   *   // of the request.
   * });
   *
   * //-
   * // If the callback is omitted, we'll return a Promise.
   * //-
   * snapshot.delete().then(function(data) {
   *   const operation = data[0];
   *   const apiResponse = data[1];
   * });
   */
  delete(callback?: OperationCallback): void | Promise<[Metadata]> {
    callback = callback || util.noop;
    this.request({method: 'DELETE', uri: ''}, (err, resp) => {
      if (err) {
        callback!(err, null, resp);
        return;
      }
      const operation = this.compute.operation(resp.name);
      operation.metadata = resp;
      callback!(null, operation, resp);
    });
  }
}

/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisifyAll(Snapshot);