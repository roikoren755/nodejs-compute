// Copyright 2015 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import * as assert from 'assert';
import * as proxyquireDefault from 'proxyquire';
import {ServiceObject, util} from '@google-cloud/common';
import type {
  MetadataCallback,
  ResponseBody,
  ServiceObjectConfig,
} from '@google-cloud/common';
import * as promisify from '@google-cloud/promisify';

import type {Compute, Operation as OperationType, Region} from '../src';

const proxyquire = proxyquireDefault.noPreserveCache();

class FakeOperation {
  calledWith_: IArguments;
  constructor() {
    // eslint-disable-next-line prefer-rest-params
    this.calledWith_ = arguments;
  }
}

class FakeServiceObject extends ServiceObject {
  calledWith_: IArguments;
  constructor(config: ServiceObjectConfig) {
    super(config);
    // eslint-disable-next-line prefer-rest-params
    this.calledWith_ = arguments;
  }
}

let parseHttpRespBodyOverride: typeof util.parseHttpRespBody | null = null;
let promisified = false;
const fakeUtil = Object.assign({}, util, {
  parseHttpRespBody: function () {
    if (parseHttpRespBodyOverride) {
      // eslint-disable-next-line prefer-spread
      return parseHttpRespBodyOverride.apply(
        null,
        // eslint-disable-next-line prefer-rest-params
        (arguments as unknown) as [any]
      );
    }
    // eslint-disable-next-line prefer-rest-params
    return util.parseHttpRespBody.apply(this, (arguments as unknown) as [any]);
  },
});

const fakePromisify = Object.assign({}, promisify, {
  promisifyAll: function (Class: typeof ServiceObject) {
    if (Class.name === 'Operation') {
      promisified = true;
    }
  },
});

describe('Operation', () => {
  let Operation: typeof OperationType;
  let operation: OperationType;

  const SCOPE = ({
    Promise: Promise,
    compute: {},
  } as unknown) as Region;
  const OPERATION_NAME = 'operation-name';

  before(() => {
    ({Operation} = proxyquire('../src/operation.js', {
      '@google-cloud/common': {
        Operation: FakeOperation,
        ServiceObject: FakeServiceObject,
        util: fakeUtil,
      },
      '@google-cloud/promisify': fakePromisify,
    }));
  });

  beforeEach(() => {
    parseHttpRespBodyOverride = null;
    operation = new Operation(SCOPE, OPERATION_NAME);
  });

  describe('instantiation', () => {
    it('should localize the name', () => {
      assert.strictEqual(operation.name, OPERATION_NAME);
    });

    it('should inherit from Operation', () => {
      assert(operation instanceof FakeOperation);

      const calledWith = ((operation as unknown) as FakeOperation)
        .calledWith_[0];

      assert.strictEqual(calledWith.parent, SCOPE);
      assert.strictEqual(calledWith.baseUrl, '/operations');
      assert.strictEqual(calledWith.id, OPERATION_NAME);
      assert.deepStrictEqual(calledWith.methods, {
        delete: true,
        exists: true,
        get: true,
      });
    });

    it('should promisify all the things', () => {
      assert(promisified);
    });

    it('should give the right baseUrl for a global Operation', () => {
      const operation = new Operation(
        {
          constructor: {
            name: 'Compute',
          },
        } as Compute,
        OPERATION_NAME
      );

      const calledWith = ((operation as unknown) as FakeOperation)
        .calledWith_[0];
      assert.strictEqual(calledWith.baseUrl, '/global/operations');
    });
  });

  describe('getMetadata', () => {
    describe('error', () => {
      const error = new Error('Error.');
      const apiResponse = {a: 'b', c: 'd'};

      beforeEach(() => {
        FakeServiceObject.prototype.getMetadata = function (
          callback: MetadataCallback
        ): any {
          callback(error, apiResponse);
        };
      });

      it.skip('should ignore false errors', done => {
        const apiResponse = {
          name: operation.name,
          error: ({
            errors: [],
          } as unknown) as Error,
        };

        operation.getMetadata = function (callback?: MetadataCallback): any {
          callback!(apiResponse.error, apiResponse);
        };

        operation.getMetadata((err, metadata, apiResponse_) => {
          assert.ifError(err);
          assert.strictEqual(metadata, apiResponse);
          assert.strictEqual(apiResponse_, apiResponse);
          done();
        });
      });

      it.skip('should execute callback with error and API response', done => {
        operation.getMetadata((err, metadata, apiResponse_) => {
          assert.strictEqual(err, error);
          assert.strictEqual(metadata, null);
          assert.strictEqual(apiResponse_, apiResponse);
          done();
        });
      });

      it.skip('should not require a callback', () => {
        assert.doesNotThrow(() => {
          operation.getMetadata();
        });
      });
    });

    describe('success', () => {
      const apiResponse = {a: 'b', c: 'd'};

      beforeEach(() => {
        FakeServiceObject.prototype.getMetadata = function (
          callback: any
        ): any {
          callback(null, apiResponse);
        };
      });

      it.skip('should update the metadata to the API response', done => {
        operation.getMetadata(err => {
          assert.ifError(err);
          assert.strictEqual(operation.metadata, apiResponse);
          done();
        });
      });

      it.skip('should exec callback with metadata and API response', done => {
        operation.getMetadata((err, metadata, apiResponse_) => {
          assert.ifError(err);
          assert.strictEqual(metadata, apiResponse);
          assert.strictEqual(apiResponse_, apiResponse);
          done();
        });
      });

      it.skip('should not require a callback', () => {
        assert.doesNotThrow(() => {
          operation.getMetadata();
        });
      });
    });
  });

  describe('poll_', () => {
    beforeEach(() => {
      operation.emit = util.noop as any;
    });

    it('should call getMetadata', done => {
      operation.getMetadata = function (): any {
        done();
      };

      operation.poll_(assert.ifError);
    });

    describe('API error', () => {
      const error = new Error('Error.');

      beforeEach(() => {
        operation.getMetadata = function (callback?: MetadataCallback): any {
          callback!(error);
        };
      });

      it('should emit the error', done => {
        operation.poll_(err => {
          assert.strictEqual(err, error);
          done();
        });
      });
    });

    describe('operation failure', () => {
      const error = new Error('Error.');
      const apiResponse = {error: error} as ResponseBody;

      beforeEach(() => {
        operation.getMetadata = function (callback?: MetadataCallback): any {
          callback!(null, apiResponse, apiResponse);
        };
      });

      it('should parse and return the response body', done => {
        const parsedHttpRespBody = {err: {}} as ResponseBody;

        parseHttpRespBodyOverride = function (body: ResponseBody) {
          assert.strictEqual(body, apiResponse);
          return parsedHttpRespBody;
        };

        operation.poll_(err => {
          assert.strictEqual(err, parsedHttpRespBody.err);
          done();
        });
      });
    });

    describe('operation running', () => {
      const apiResponse = {status: 'RUNNING'} as ResponseBody;

      beforeEach(() => {
        operation.getMetadata = function (callback?: MetadataCallback): any {
          callback!(null, apiResponse, apiResponse);
        };
      });

      it('should update status', done => {
        delete operation.status;

        operation.poll_(err => {
          assert.ifError(err);
          assert.strictEqual(operation.status, apiResponse.status);
          done();
        });
      });

      it('should emit the running event', done => {
        operation.emit = function (eventName, metadata): any {
          assert.strictEqual(eventName, 'running');
          assert.strictEqual(metadata, apiResponse);
          done();
        };

        operation.poll_(assert.ifError);
      });

      it('should not emit running if already running', done => {
        operation.emit = function (eventName): any {
          assert.strictEqual(eventName, 'running');

          operation.emit = done as any; // will fail test if called
          operation.poll_(done);
        };

        operation.poll_(assert.ifError);
      });
    });

    describe('operation complete', () => {
      const apiResponse = {status: 'DONE'} as ResponseBody;

      beforeEach(() => {
        operation.getMetadata = function (callback?: MetadataCallback): any {
          callback!(null, apiResponse, apiResponse);
        };
      });

      it('should update status', done => {
        operation.status = 'PENDING';

        operation.poll_(err => {
          assert.ifError(err);
          assert.strictEqual(operation.status, apiResponse.status);
          done();
        });
      });

      it('should execute callback with metadata', done => {
        operation.poll_((err, metadata) => {
          assert.ifError(err);
          assert.strictEqual(metadata, apiResponse);
          done();
        });
      });
    });
  });
});
