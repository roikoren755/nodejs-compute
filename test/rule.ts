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
import * as proxyquire from 'proxyquire';
import {ServiceObject, util} from '@google-cloud/common';
import type {
  ApiError,
  BodyResponseCallback,
  DecorateRequestOptions,
  Metadata,
  MetadataCallback,
  ServiceObjectConfig,
} from '@google-cloud/common';
import * as promisify from '@google-cloud/promisify';

import type {Compute as ComputeType, Operation, Rule as RuleType} from '../src';

let promisified = false;
const fakePromisify = Object.assign({}, promisify, {
  promisifyAll: function (Class: typeof ServiceObject) {
    if (Class.name === 'Rule') {
      promisified = true;
    }
  },
});

class FakeServiceObject extends ServiceObject {
  calledWith_: IArguments;
  constructor(config: ServiceObjectConfig) {
    super(config);
    // eslint-disable-next-line prefer-rest-params
    this.calledWith_ = arguments;
  }
}

describe('Rule', () => {
  let Rule: typeof RuleType;
  let rule: RuleType;

  function Compute(this: ComputeType) {
    this.createRule = util.noop as any;
    this.operation = util.noop as any;

    return this;
  }

  // @ts-expect-error
  const COMPUTE = new Compute();
  const RULE_NAME = 'rule-name';

  before(() => {
    ({Rule} = proxyquire('../src/rule.js', {
      '@google-cloud/common': {
        ServiceObject: FakeServiceObject,
      },
      '@google-cloud/promisify': fakePromisify,
    }));
  });

  beforeEach(() => {
    rule = new Rule(COMPUTE, RULE_NAME);
  });

  describe('instantiation', () => {
    it('should inherit from ServiceObject', () => {
      // @ts-expect-error
      const computeInstance = new Compute();
      const bindMethod = {};

      Object.assign(computeInstance, {
        createRule: {
          bind: function (context: any) {
            assert.strictEqual(context, computeInstance);
            return bindMethod;
          },
        },
      });

      const rule = new Rule(computeInstance, RULE_NAME);
      assert(rule instanceof FakeServiceObject);

      const calledWith = ((rule as unknown) as FakeServiceObject)
        .calledWith_[0];

      assert.strictEqual(calledWith.parent, computeInstance);
      assert.strictEqual(calledWith.baseUrl, '/global/forwardingRules');
      assert.strictEqual(calledWith.id, RULE_NAME);
      assert.strictEqual(calledWith.createMethod, bindMethod);
      assert.deepStrictEqual(calledWith.methods, {
        create: true,
        exists: true,
        get: true,
        getMetadata: true,
      });
    });

    it('should promisify all the things', () => {
      assert(promisified);
    });

    it('should not use global forwarding rules', () => {
      const rule = new Rule(
        ({createRule: util.noop, compute: {}} as unknown) as ComputeType,
        RULE_NAME
      );
      assert(rule instanceof FakeServiceObject);

      const calledWith = ((rule as unknown) as FakeServiceObject)
        .calledWith_[0];

      assert.strictEqual(calledWith.baseUrl, '/forwardingRules');
    });

    it('should localize the scope', () => {
      assert.strictEqual(rule.scope, COMPUTE);
    });
  });

  describe('delete', () => {
    it('should call ServiceObject.delete', done => {
      FakeServiceObject.prototype.request = function (): any {
        assert.strictEqual(this, rule);
        done();
      };

      rule.delete();
    });

    describe('error', () => {
      const error = new Error('Error.');
      const apiResponse = {a: 'b', c: 'd'};

      beforeEach(() => {
        FakeServiceObject.prototype.request = function (
          options: DecorateRequestOptions,
          callback?: MetadataCallback
        ): any {
          callback!(error, apiResponse);
        };
      });

      it('should return an error if the request fails', done => {
        rule.delete(
          (
            err: ApiError | null,
            operation?: Operation | null,
            apiResponse_?: Metadata | null
          ) => {
            assert.strictEqual(err, error);
            assert.strictEqual(operation, null);
            assert.strictEqual(apiResponse_, apiResponse);
            done();
          }
        );
      });

      it('should not require a callback', () => {
        assert.doesNotThrow(() => {
          rule.delete();
        });
      });
    });

    describe('success', () => {
      const apiResponse = {
        name: 'op-name',
      };

      beforeEach(() => {
        FakeServiceObject.prototype.request = function (
          options: DecorateRequestOptions,
          callback?: MetadataCallback
        ): any {
          callback!(null, apiResponse);
        };
      });

      it('should execute callback with Operation & Response', done => {
        const operation = {} as Operation;

        rule.scope.operation = function (name) {
          assert.strictEqual(name, apiResponse.name);
          return operation;
        };

        rule.delete(
          (
            err: ApiError | null,
            operation_?: Operation | null,
            apiResponse_?: Metadata | null
          ) => {
            assert.ifError(err);
            assert.strictEqual(operation_, operation);
            assert.strictEqual(operation_!.metadata, apiResponse);
            assert.strictEqual(apiResponse_, apiResponse);
            done();
          }
        );
      });

      it('should not require a callback', () => {
        assert.doesNotThrow(() => {
          rule.delete();
        });
      });
    });
  });

  describe('setTarget', () => {
    const TARGET = 'target';

    it('should make the correct API request', done => {
      rule.request = function (reqOpts: DecorateRequestOptions): any {
        assert.strictEqual(reqOpts.method, 'POST');
        assert.strictEqual(reqOpts.uri, '/setTarget');
        assert.deepStrictEqual(reqOpts.json, {target: TARGET});

        done();
      };

      rule.setTarget(TARGET, assert.ifError);
    });

    describe('error', () => {
      const error = new Error('Error.');
      const apiResponse = {};

      beforeEach(() => {
        rule.request = function (
          reqOpts: DecorateRequestOptions,
          callback?: BodyResponseCallback
        ): any {
          callback!(error, apiResponse);
        };
      });

      it('should return an error if the request fails', done => {
        rule.setTarget(TARGET, (err, op, apiResponse_) => {
          assert.strictEqual(err, error);
          assert.strictEqual(op, null);
          assert.strictEqual(apiResponse_, apiResponse);
          done();
        });
      });
    });

    describe('success', () => {
      const apiResponse = {
        name: 'op-name',
      };

      beforeEach(() => {
        rule.request = function (
          reqOpts: DecorateRequestOptions,
          callback?: BodyResponseCallback
        ): any {
          callback!(null, apiResponse);
        };
      });

      it('should execute callback with operation & response', done => {
        const operation = {} as Operation;

        rule.scope.operation = function (name) {
          assert.strictEqual(name, apiResponse.name);
          return operation;
        };

        rule.setTarget(TARGET, (err, op, apiResponse_) => {
          assert.ifError(err);
          assert.strictEqual(op, operation);
          assert.strictEqual(op!.metadata, apiResponse);
          assert.strictEqual(apiResponse_, apiResponse);
          done();
        });
      });

      it('should not require a callback', () => {
        assert.doesNotThrow(() => {
          rule.setTarget(TARGET);
        });
      });
    });
  });
});
